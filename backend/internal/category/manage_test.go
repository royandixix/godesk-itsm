package category

import "testing"

func TestCategorySlug(t *testing.T) {
    cases := []struct{ in, want string }{
        {"Technical Support", "technical-support"},
        {"  Network & WiFi  ", "network-wifi"},
        {"Billing 2026", "billing-2026"},
        {"---", ""},
    }
    for _, tc := range cases {
        if got := categorySlug(tc.in); got != tc.want {
            t.Errorf("slug(%q) = %q, want %q", tc.in, got, tc.want)
        }
    }
}

func TestValidateCategory(t *testing.T) {
    if _, _, err := validateCategory(manageInput{Name: "A"}); err == nil {
        t.Fatal("short name should fail")
    }
    if _, _, err := validateCategory(manageInput{Name: "---"}); err == nil {
        t.Fatal("empty slug should fail")
    }
    if _, slug, err := validateCategory(manageInput{Name: "Network Support"}); err != nil || slug != "network-support" {
        t.Fatalf("unexpected slug %q: %v", slug, err)
    }
}
