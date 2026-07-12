package backend

import (
	"os"
	"path/filepath"
	"strings"
)

type PathFile struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Data []byte `json:"data"`
}

type ReadPathsResult struct {
	Files             []PathFile `json:"files"`
	DroppedFolderName string     `json:"droppedFolderName,omitempty"`
	UnsupportedFile   string     `json:"unsupportedFile,omitempty"`
}

type PathFileStat struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
}

func ParseLaunchPaths(args []string) []string {
	paths := make([]string, 0, len(args))
	for _, arg := range args {
		trimmed := strings.TrimSpace(arg)
		if trimmed == "" {
			continue
		}
		paths = append(paths, trimmed)
	}
	return paths
}

func ReadPathsFromDisk(paths []string) (ReadPathsResult, error) {
	result := ReadPathsResult{}

	if len(paths) == 0 {
		return result, nil
	}

	var collectedPaths []string
	var droppedFolderName string

	if len(paths) == 1 {
		filePaths, folderName, unsupported, err := collectPathsFromEntry(paths[0])
		if err != nil {
			return result, err
		}
		if unsupported != "" {
			result.UnsupportedFile = unsupported
			return result, nil
		}
		collectedPaths = filePaths
		droppedFolderName = folderName
	} else {
		for _, path := range paths {
			filePaths, _, unsupported, err := collectPathsFromEntry(path)
			if err != nil {
				return result, err
			}
			if unsupported != "" {
				continue
			}
			collectedPaths = append(collectedPaths, filePaths...)
		}
	}

	files := make([]PathFile, 0, len(collectedPaths))
	for _, path := range collectedPaths {
		data, err := os.ReadFile(path)
		if err != nil {
			return result, err
		}

		files = append(files, PathFile{
			Name: filepath.Base(path),
			Path: path,
			Data: data,
		})
	}

	result.Files = files
	result.DroppedFolderName = droppedFolderName
	return result, nil
}

func (a *App) ReadPaths(paths []string) (ReadPathsResult, error) {
	return ReadPathsFromDisk(paths)
}

func (a *App) StatPaths(paths []string) ([]PathFileStat, error) {
	stats := make([]PathFileStat, 0, len(paths))
	for _, path := range paths {
		info, err := os.Stat(path)
		if err != nil {
			return nil, err
		}

		stats = append(stats, PathFileStat{
			Path: path,
			Size: info.Size(),
		})
	}

	return stats, nil
}

// OpenLinkFile resolves the target of a Windows shortcut (.lnk) supplied as raw
// bytes and opens the referenced file or folder through the regular read
// pipeline. The web side detects the shortcut and redirects the call here.
func (a *App) OpenLinkFile(lnkData []byte) (ReadPathsResult, error) {
	target, err := resolveShortcutTarget(lnkData)
	if err != nil {
		return ReadPathsResult{}, err
	}

	return ReadPathsFromDisk([]string{target})
}

func collectPathsFromEntry(path string) (filePaths []string, droppedFolderName string, unsupported string, err error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, "", "", err
	}

	if info.IsDir() {
		entries, err := os.ReadDir(path)
		if err != nil {
			return nil, "", "", err
		}

		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			if isOurFileName(entry.Name()) {
				filePaths = append(filePaths, filepath.Join(path, entry.Name()))
			}
		}

		return filePaths, filepath.Base(path), "", nil
	}

	name := filepath.Base(path)
	if isOurFileName(name) {
		return []string{path}, "", "", nil
	}

	return nil, "", name, nil
}

func isOurFileName(name string) bool {
	lower := strings.ToLower(name)
	return strings.HasSuffix(lower, ".trc3") || strings.HasSuffix(lower, ".zip")
}
