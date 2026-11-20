//! Pure yt-dlp stdout line parser (port of progress-parser.ts from the Electron version).
//! Lines are produced by yt-dlp with:
//!   --newline --progress-template "download:PROG|%(progress.status)s|%(progress.downloaded_bytes)s|
//!     %(progress.total_bytes_estimate)s|%(progress.total_bytes)s|%(progress.speed)s|%(progress.eta)s"

use regex::Regex;
use std::sync::LazyLock;

#[derive(Debug, Default, Clone, PartialEq)]
pub struct ParsedProgress {
    pub status: Option<&'static str>, // "downloading" | "processing" | "finished"
    pub downloaded_bytes: Option<u64>,
    pub total_bytes: Option<u64>,
    pub percent: Option<f64>,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub file_path: Option<String>,
}

fn num(s: Option<&&str>) -> Option<u64> {
    match s {
        Some(v) if !v.is_empty() && *v != "NA" => v.parse().ok(),
        _ => None,
    }
}

fn strv(s: Option<&&str>) -> Option<String> {
    match s {
        Some(v) if !v.is_empty() && *v != "NA" => Some(v.to_string()),
        _ => None,
    }
}

static RE_DESTINATION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\[download\] Destination: (.+)$").unwrap());
static RE_MERGER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"Merging formats into "(.+)"$"#).unwrap());
static RE_EXTRACT_AUDIO: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\[ExtractAudio\] Destination: (.+)$").unwrap());
static RE_REMUXER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"^\[(?:VideoRemuxer|VideoConvertor)\].*? to "(.+)"$"#).unwrap());
static RE_ALREADY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\[download\] (.+?) has already been downloaded").unwrap());
static RE_PROCESSING: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\[(?:EmbedSubtitle|EmbedThumbnail|Metadata|Fixup\w*)\]").unwrap());

/// Parse one stdout line; returns progress info or None if the line carries none.
pub fn parse_line(line: &str) -> Option<ParsedProgress> {
    if line.starts_with("PROG|") {
        let parts: Vec<&str> = line.split('|').collect();
        let status = parts.get(1).copied().unwrap_or("");
        let downloaded = num(parts.get(2));
        let estimate = num(parts.get(3));
        let total = num(parts.get(4)).or(estimate);
        let mut percent = match (downloaded, total) {
            (Some(d), Some(t)) if t > 0 => {
                Some((((d as f64 / t as f64) * 1000.0).round() / 10.0).min(99.9))
            }
            _ => None,
        };
        if status == "finished" {
            percent = Some(100.0);
        }
        return Some(ParsedProgress {
            status: Some(if status == "finished" {
                "finished"
            } else {
                "downloading"
            }),
            downloaded_bytes: downloaded,
            total_bytes: total,
            percent,
            speed: strv(parts.get(5)),
            eta: strv(parts.get(6)),
            file_path: None,
        });
    }

    if let Some(m) = RE_DESTINATION.captures(line) {
        return Some(ParsedProgress {
            file_path: Some(m[1].to_string()),
            ..Default::default()
        });
    }
    if let Some(m) = RE_MERGER.captures(line) {
        return Some(ParsedProgress {
            status: Some("processing"),
            file_path: Some(m[1].to_string()),
            ..Default::default()
        });
    }
    if let Some(m) = RE_EXTRACT_AUDIO.captures(line) {
        return Some(ParsedProgress {
            status: Some("processing"),
            file_path: Some(m[1].to_string()),
            ..Default::default()
        });
    }
    if let Some(m) = RE_REMUXER.captures(line) {
        return Some(ParsedProgress {
            status: Some("processing"),
            file_path: Some(m[1].to_string()),
            ..Default::default()
        });
    }
    if let Some(m) = RE_ALREADY.captures(line) {
        return Some(ParsedProgress {
            status: Some("finished"),
            percent: Some(100.0),
            file_path: Some(m[1].to_string()),
            ..Default::default()
        });
    }
    if RE_PROCESSING.is_match(line) {
        return Some(ParsedProgress {
            status: Some("processing"),
            ..Default::default()
        });
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn start_of_download() {
        let p = parse_line("PROG|downloading|1024|NA|10485760|512.00KiB|00:20").unwrap();
        assert_eq!(p.status, Some("downloading"));
        assert_eq!(p.downloaded_bytes, Some(1024));
        assert_eq!(p.total_bytes, Some(10485760));
        assert_eq!(p.percent, Some(0.0));
        assert_eq!(p.speed.as_deref(), Some("512.00KiB"));
        assert_eq!(p.eta.as_deref(), Some("00:20"));
    }

    #[test]
    fn estimate_used_when_total_na() {
        let p = parse_line("PROG|downloading|5242880|10485760|NA|2.00MiB|00:03").unwrap();
        assert_eq!(p.total_bytes, Some(10485760));
        assert_eq!(p.percent, Some(50.0));
    }

    #[test]
    fn unknown_size_has_no_percent() {
        let p = parse_line("PROG|downloading|1048576|NA|NA|1.00MiB|NA").unwrap();
        assert_eq!(p.total_bytes, None);
        assert_eq!(p.percent, None);
        assert_eq!(p.speed.as_deref(), Some("1.00MiB"));
        assert_eq!(p.eta, None);
    }

    #[test]
    fn finished() {
        let p = parse_line("PROG|finished|10485760|NA|10485760|NA|NA").unwrap();
        assert_eq!(p.status, Some("finished"));
        assert_eq!(p.percent, Some(100.0));
    }

    #[test]
    fn percent_capped_below_100_while_downloading() {
        let p = parse_line("PROG|downloading|20971520|NA|10485760|1.00MiB|00:01").unwrap();
        assert_eq!(p.percent, Some(99.9));
    }

    #[test]
    fn destination() {
        let p = parse_line(r"[download] Destination: C:\DL\My Video.mp4").unwrap();
        assert_eq!(p.file_path.as_deref(), Some(r"C:\DL\My Video.mp4"));
    }

    #[test]
    fn merger() {
        let p = parse_line(r#"[Merger] Merging formats into "C:\DL\My Video.mp4""#).unwrap();
        assert_eq!(p.status, Some("processing"));
        assert_eq!(p.file_path.as_deref(), Some(r"C:\DL\My Video.mp4"));
    }

    #[test]
    fn extract_audio() {
        let p = parse_line(r"[ExtractAudio] Destination: C:\DL\Song.mp3").unwrap();
        assert_eq!(p.status, Some("processing"));
        assert_eq!(p.file_path.as_deref(), Some(r"C:\DL\Song.mp3"));
    }

    #[test]
    fn remuxer() {
        let p =
            parse_line(r#"[VideoRemuxer] Remuxing video from mkv to "C:\DL\My Video.mp4""#).unwrap();
        assert_eq!(p.status, Some("processing"));
        assert_eq!(p.file_path.as_deref(), Some(r"C:\DL\My Video.mp4"));
    }

    #[test]
    fn already_downloaded() {
        let p = parse_line(r"[download] C:\DL\My Video.mp4 has already been downloaded").unwrap();
        assert_eq!(p.status, Some("finished"));
        assert_eq!(p.percent, Some(100.0));
        assert_eq!(p.file_path.as_deref(), Some(r"C:\DL\My Video.mp4"));
    }

    #[test]
    fn embed_subs_is_processing() {
        let p = parse_line(r#"[EmbedSubtitle] Embedding subtitles in "C:\DL\v.mp4""#).unwrap();
        assert_eq!(p.status, Some("processing"));
        assert_eq!(p.file_path, None);
    }

    #[test]
    fn unrelated_lines_ignored() {
        assert_eq!(
            parse_line("[youtube] aqz-KE-bpKQ: Downloading player API JSON"),
            None
        );
        assert_eq!(
            parse_line("[info] aqz-KE-bpKQ: Downloading 1 format(s): 248+251"),
            None
        );
    }
}
