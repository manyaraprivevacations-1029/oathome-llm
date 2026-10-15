package llm

import (
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"testing"
)

func TestLlamaCppBinaryCandidates(t *testing.T) {
	root := t.TempDir()

	tests := []struct {
		name      string
		search    llamaCppBinarySearch
		want      []string
		wantFirst string
	}{
		{
			name: "linux production layout",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "linux", "bin", "own"),
				goos:       "linux",
				goarch:     "amd64",
			},
			want:      []string{filepath.Join(root, "linux", "lib", "own", "llama-server")},
			wantFirst: filepath.Join(root, "linux", "lib", "own", "llama-server"),
		},
		{
			name: "windows production layout",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "windows", "own.exe"),
				goos:       "windows",
				goarch:     "amd64",
			},
			want:      []string{filepath.Join(root, "windows", "lib", "own", "llama-server.exe")},
			wantFirst: filepath.Join(root, "windows", "lib", "own", "llama-server.exe"),
		},
		{
			name: "darwin production layout",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "OWN.app", "Contents", "Resources", "own"),
				goos:       "darwin",
				goarch:     "arm64",
			},
			want:      []string{filepath.Join(root, "OWN.app", "Contents", "Resources", "llama-server")},
			wantFirst: filepath.Join(root, "OWN.app", "Contents", "Resources", "llama-server"),
		},
		{
			name: "darwin standard install layout",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "darwin", "bin", "own"),
				goos:       "darwin",
				goarch:     "arm64",
			},
			want: []string{filepath.Join(root, "darwin", "lib", "own", "llama-server")},
		},
		{
			name: "windows standard install layout",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "windows", "bin", "own.exe"),
				goos:       "windows",
				goarch:     "amd64",
			},
			want: []string{filepath.Join(root, "windows", "lib", "own", "llama-server.exe")},
		},
		{
			name: "local per-architecture dist layout",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "dist", "darwin-arm64", "own"),
				goos:       "darwin",
				goarch:     "arm64",
			},
			want: []string{filepath.Join(root, "dist", "darwin-arm64", "lib", "own", "llama-server")},
		},
		{
			name: "local top-level executable on linux",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "own"),
				workingDir: root,
				goos:       "linux",
				goarch:     "amd64",
			},
			want: []string{
				filepath.Join(root, "build", "lib", "own", "llama-server"),
				filepath.Join(root, "dist", "linux-amd64", "lib", "own", "llama-server"),
				filepath.Join(root, "dist", "linux_amd64", "lib", "own", "llama-server"),
			},
		},
		{
			name: "local top-level executable on windows",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "own.exe"),
				workingDir: root,
				goos:       "windows",
				goarch:     "amd64",
			},
			want: []string{
				filepath.Join(root, "build", "lib", "own", "llama-server.exe"),
				filepath.Join(root, "dist", "windows-amd64", "lib", "own", "llama-server.exe"),
			},
		},
		{
			name: "local top-level executable on darwin",
			search: llamaCppBinarySearch{
				executable: filepath.Join(root, "own"),
				workingDir: root,
				goos:       "darwin",
				goarch:     "arm64",
			},
			want: []string{
				filepath.Join(root, "build", "lib", "own", "llama-server"),
				filepath.Join(root, "dist", "darwin-arm64", "lib", "own", "llama-server"),
				filepath.Join(root, "dist", "darwin", "llama-server"),
			},
		},
		{
			name: "explicit lib path stays first",
			search: llamaCppBinarySearch{
				libOWNPath: filepath.Join(root, "install", "lib", "own"),
				executable:    filepath.Join(root, "app", "own"),
				workingDir:    filepath.Join(root, "work"),
				goos:          "linux",
				goarch:        "amd64",
			},
			want: []string{filepath.Join(root, "install", "lib", "own", "llama-server")},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			candidates := llamaCppBinaryCandidates("llama-server", tt.search)
			if tt.wantFirst != "" && candidates[0] != tt.wantFirst {
				t.Fatalf("first candidate = %q, want %q; all candidates: %v", candidates[0], tt.wantFirst, candidates)
			}
			if tt.search.libOWNPath != "" && candidates[0] != tt.want[0] {
				t.Fatalf("first candidate = %q, want %q; all candidates: %v", candidates[0], tt.want[0], candidates)
			}
			for _, want := range tt.want {
				if !slices.Contains(candidates, want) {
					t.Fatalf("missing candidate %q; all candidates: %v", want, candidates)
				}
			}
		})
	}
}

func TestLlamaCppBinarySearchPrefersPlatformBuildOutput(t *testing.T) {
	root := t.TempDir()
	cpuDir := filepath.Join(root, "build", "llama-server-cpu", "bin")
	cudaDir := filepath.Join(root, "build", "llama-server-cuda", "bin")
	for _, dir := range []string{cpuDir, cudaDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	name := llamaCppBinaryName("llama-quantize", runtime.GOOS)
	cpuBin := filepath.Join(cpuDir, name)
	cudaBin := filepath.Join(cudaDir, name)
	for _, path := range []string{cpuBin, cudaBin} {
		if err := os.WriteFile(path, nil, 0o755); err != nil {
			t.Fatal(err)
		}
	}

	got, _, err := findLlamaCppBinary("llama-quantize", llamaCppBinarySearch{workingDir: root})
	if err != nil {
		t.Fatal(err)
	}
	if got != cudaBin {
		t.Fatalf("findLlamaCppBinary = %q, want %q", got, cudaBin)
	}
}
