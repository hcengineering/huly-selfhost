package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestApplyDefaults(t *testing.T) {
	c := Config{}
	c.ApplyDefaults()
	if c.HulyVersion != DefaultVersion {
		t.Fatalf("expected default version %q, got %q", DefaultVersion, c.HulyVersion)
	}
	if c.DesktopChan != DefaultDesktop {
		t.Fatalf("expected default desktop channel %q, got %q", DefaultDesktop, c.DesktopChan)
	}
	if !c.LastNameFirst {
		t.Fatal("LastNameFirst should default to true")
	}
	if c.Profile != ProfileMulti {
		t.Fatalf("expected default profile multi, got %q", c.Profile)
	}
	if c.Topology != TopologyBuiltin {
		t.Fatalf("expected default topology builtin, got %q", c.Topology)
	}
}

func TestValidate(t *testing.T) {
	c := Config{}
	c.ApplyDefaults()
	if err := c.Validate(); err == nil {
		t.Fatal("expected validation error for empty host")
	}
	c.HostAddress = "huly.example.com"
	c.HTTPPort = 80
	if err := c.Validate(); err != nil {
		t.Fatalf("expected ok, got %v", err)
	}
	c.HTTPPort = 70000
	if err := c.Validate(); err == nil {
		t.Fatal("expected validation error for bad port")
	}
	c.HTTPPort = 80
	c.Profile = "weird"
	if err := c.Validate(); err == nil {
		t.Fatal("expected validation error for bad profile")
	}
	c.Profile = ProfileMulti
	c.Topology = "weird"
	if err := c.Validate(); err == nil {
		t.Fatal("expected validation error for bad topology")
	}
}

func TestIsLocal(t *testing.T) {
	cases := map[string]bool{
		"localhost":  true,
		"127.0.0.1":  true,
		"127.0.0.5":  true,
		"::1":        true,
		"huly.local": false,
		"":           true,
	}
	for host, want := range cases {
		c := Config{HostAddress: host}
		if got := c.IsLocal(); got != want {
			t.Errorf("IsLocal(%q) = %v, want %v", host, got, want)
		}
	}
}

func TestLoadSave(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "huly_v7.conf")
	want := Config{
		HulyVersion:       "v0.7.426",
		DesktopChan:       "0.7.426",
		ComposeName:       "huly_v7",
		Profile:           ProfileSingle,
		Topology:          TopologyReverse,
		HostAddress:       "huly.example.com",
		HTTPPort:          443,
		Secure:            true,
		Title:             "Acme",
		DefaultLanguage:   "en",
		LastNameFirst:     true,
		CRDatabase:        "defaultdb",
		CRUsername:        "selfhost",
		RedpandaAdmin:     "superadmin",
		VolumeElasticPath: "/srv/elastic",
	}
	if err := Save(want, path); err != nil {
		t.Fatal(err)
	}
	got, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if got.HulyVersion != want.HulyVersion ||
		got.Profile != want.Profile ||
		got.Topology != want.Topology ||
		got.HostAddress != want.HostAddress ||
		got.HTTPPort != want.HTTPPort ||
		got.Secure != want.Secure ||
		got.VolumeElasticPath != want.VolumeElasticPath ||
		got.ComposeName != want.ComposeName {
		t.Fatalf("round trip mismatch:\n want=%+v\n got =%+v", want, got)
	}
}

func TestLoadFromExistingExample(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "huly_v7.conf")
	body := []byte(`HULY_VERSION=v0.6.501
HOST_ADDRESS=localhost:8080
SECURE=
HTTP_PORT=8080
HTTP_BIND=
TITLE=Huly Self Host
LAST_NAME_FIRST=true
CR_USER_PASSWORD=foo
`)
	if err := os.WriteFile(path, body, 0o644); err != nil {
		t.Fatal(err)
	}
	c, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if c.HulyVersion != "v0.6.501" || c.HostAddress != "localhost:8080" || c.HTTPPort != 8080 {
		t.Fatalf("unexpected: %+v", c)
	}
	if c.Secure {
		t.Fatal("SECURE= should not be true")
	}
}
