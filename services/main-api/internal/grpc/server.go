package grpc

import (
	"context"
	"net"

	"go-stream/services/main-api/internal/domain"
	pb "go-stream/services/main-api/internal/grpc/moderation"
	"go-stream/services/main-api/pkg/logger"

	"google.golang.org/grpc"
)

type ModerationGrpcServer struct {
	pb.UnimplementedModerationServiceServer
	moderationSvc domain.ModerationService
}

func NewModerationGrpcServer(moderationSvc domain.ModerationService) *ModerationGrpcServer {
	return &ModerationGrpcServer{moderationSvc: moderationSvc}
}

func (s *ModerationGrpcServer) IsUserMuted(ctx context.Context, req *pb.MuteStatusRequest) (*pb.MuteStatusResponse, error) {
	isMuted, reason, err := s.moderationSvc.IsUserMuted(ctx, uint(req.RoomId), uint(req.UserId))
	if err != nil {
		return nil, err
	}
	return &pb.MuteStatusResponse{
		IsMuted: isMuted,
		Reason:  reason,
	}, nil
}

func StartGrpcServer(port string, moderationSvc domain.ModerationService) (*grpc.Server, error) {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return nil, err
	}

	grpcServer := grpc.NewServer()
	pb.RegisterModerationServiceServer(grpcServer, NewModerationGrpcServer(moderationSvc))

	logger.Info("gRPC Server starting", "port", port)
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			logger.Error("gRPC Server failed to serve", err)
		}
	}()

	return grpcServer, nil
}
