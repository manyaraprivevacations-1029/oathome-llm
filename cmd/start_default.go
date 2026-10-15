//go:build !windows && !darwin

package cmd

import (
	"context"
	"errors"

	"github.com/own/own/api"
)

func startApp(ctx context.Context, client *api.Client) error {
	return errors.New("could not connect to own server, run 'own serve' to start it")
}
