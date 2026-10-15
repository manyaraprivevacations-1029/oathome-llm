package ml

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFindLibOWNPath(t *testing.T) {
	root := t.TempDir()

	tests := []struct {
		name   string
		search libOWNPathSearch
		dirs   []string
		want   string
	}{
		{
			name: "darwin release layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "darwin-app", "OWN.app", "Contents", "Resources", "own"),
				goos:       "darwin",
				goarch:     "arm64",
			},
			dirs: []string{filepath.Join(root, "darwin-app", "OWN.app", "Contents", "Resources")},
			want: filepath.Join(root, "darwin-app", "OWN.app", "Contents", "Resources"),
		},
		{
			name: "darwin standard install layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "darwin-install", "bin", "own"),
				goos:       "darwin",
				goarch:     "arm64",
			},
			dirs: []string{filepath.Join(root, "darwin-install", "lib", "own")},
			want: filepath.Join(root, "darwin-install", "lib", "own"),
		},
		{
			name: "windows release layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "windows-release", "own.exe"),
				goos:       "windows",
				goarch:     "amd64",
			},
			dirs: []string{filepath.Join(root, "windows-release", "lib", "own")},
			want: filepath.Join(root, "windows-release", "lib", "own"),
		},
		{
			name: "windows standard install layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "windows-install", "bin", "own.exe"),
				goos:       "windows",
				goarch:     "amd64",
			},
			dirs: []string{filepath.Join(root, "windows-install", "lib", "own")},
			want: filepath.Join(root, "windows-install", "lib", "own"),
		},
		{
			name: "linux standard install layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "linux-install", "bin", "own"),
				goos:       "linux",
				goarch:     "amd64",
			},
			dirs: []string{filepath.Join(root, "linux-install", "lib", "own")},
			want: filepath.Join(root, "linux-install", "lib", "own"),
		},
		{
			name: "local linux underscore dist layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "linux-dev", "own"),
				workingDir: filepath.Join(root, "linux-dev"),
				goos:       "linux",
				goarch:     "amd64",
			},
			dirs: []string{filepath.Join(root, "linux-dev", "dist", "linux_amd64", "lib", "own")},
			want: filepath.Join(root, "linux-dev", "dist", "linux_amd64", "lib", "own"),
		},
		{
			name: "mlx-only standard install layout",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "mlx-install", "bin", "own"),
				goos:       "linux",
				goarch:     "amd64",
			},
			dirs: []string{filepath.Join(root, "mlx-install", "lib", "own")},
			want: filepath.Join(root, "mlx-install", "lib", "own"),
		},
		{
			name: "darwin local build layout before executable directory fallback",
			search: libOWNPathSearch{
				executable: filepath.Join(root, "darwin-dev", "own"),
				workingDir: filepath.Join(root, "darwin-dev"),
				goos:       "darwin",
				goarch:     "arm64",
			},
			dirs: []string{filepath.Join(root, "darwin-dev", "build", "lib", "own")},
			want: filepath.Join(root, "darwin-dev", "build", "lib", "own"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, dir := range tt.dirs {
				if err := os.MkdirAll(dir, 0o755); err != nil {
					t.Fatal(err)
				}
			}

			got := findLibOWNPath(tt.search)
			if got != tt.want {
				t.Fatalf("findLibOWNPath() = %q, want %q; candidates: %v", got, tt.want, libOWNPathCandidates(tt.search))
			}
		})
	}
}
