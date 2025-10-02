package api

import (
	"context"
	"log/slog"

	"connectrpc.com/connect"
	"connectrpc.com/validate"
)

// LoggerInterceptor abstracts and logs the request details
func loggerInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return connect.UnaryFunc(func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			// Log request details
			slog.InfoContext(ctx, req.Spec().Procedure, "request received",
				slog.Any("headers", req.Header()),
				slog.Any("message", req),
			)

			return next(ctx, req)
		})
	}
	return connect.UnaryInterceptorFunc(interceptor)
}

// ValidationInterceptor abstracts and performs validation on the request
func validationInterceptor() *validate.Interceptor {
	interceptor, err := validate.NewInterceptor()
	if err != nil {
		slog.Error("failed to create gRPC server validate interceptor", slog.String("error", err.Error()))
		panic(err)
	}
	return interceptor
}

func getInterceptors() []connect.Interceptor {
	return []connect.Interceptor{
		loggerInterceptor(),
		validationInterceptor(),
		// Add more interceptors here in the future as needed
	}
}
