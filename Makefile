GO ?= go
BINARY ?= huly-setup
DIST ?= dist

.PHONY: build test lint fmt clean run install

build:
	$(GO) build -trimpath -ldflags "-s -w" -o $(BINARY) ./cmd/huly-setup

test:
	$(GO) test ./... -count=1

fmt:
	$(GO) fmt ./...

vet:
	$(GO) vet ./...

clean:
	rm -f $(BINARY)
	rm -rf $(DIST)

run: build
	./$(BINARY)

install: build
	install -d $$HOME/.local/bin
	install -m 0755 $(BINARY) $$HOME/.local/bin/$(BINARY)
	@echo "Installed to $$HOME/.local/bin/$(BINARY)"
