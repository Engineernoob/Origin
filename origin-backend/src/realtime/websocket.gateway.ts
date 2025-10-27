import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('WebSocketGateway');
  private connectedUsers = new Map<number, string>(); // userId -> socketId

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    try {
      // Extract user info from JWT token in handshake auth
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        // You'll need to verify the JWT token here
        // const user = await this.authService.verifyToken(token);
        // client.userId = user.id;
        // client.userName = user.name;
        // this.connectedUsers.set(user.id, client.id);
      }

      this.logger.log(`Client connected: ${client.id}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinVideoRoom')
  async handleJoinVideoRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { videoId: string },
  ) {
    const room = `video:${data.videoId}`;
    await client.join(room);

    // Broadcast that a user joined
    client.to(room).emit('userJoined', {
      userId: client.userId,
      userName: client.userName,
      timestamp: new Date(),
    });

    // Send current viewer count
    const sockets = await this.server.in(room).fetchSockets();
    this.server.to(room).emit('viewerCount', { count: sockets.length });

    this.logger.log(`User ${client.userId} joined video room: ${data.videoId}`);
  }

  @SubscribeMessage('leaveVideoRoom')
  async handleLeaveVideoRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { videoId: string },
  ) {
    const room = `video:${data.videoId}`;
    await client.leave(room);

    // Broadcast that a user left
    client.to(room).emit('userLeft', {
      userId: client.userId,
      userName: client.userName,
      timestamp: new Date(),
    });

    // Send updated viewer count
    const sockets = await this.server.in(room).fetchSockets();
    this.server.to(room).emit('viewerCount', { count: sockets.length });

    this.logger.log(`User ${client.userId} left video room: ${data.videoId}`);
  }

  @SubscribeMessage('sendComment')
  @UseGuards(JwtAuthGuard)
  async handleComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { videoId: string; content: string; parentId?: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    const comment = {
      id: Date.now().toString(), // Replace with proper UUID generation
      videoId: data.videoId,
      userId: client.userId,
      userName: client.userName,
      content: data.content,
      parentId: data.parentId || null,
      timestamp: new Date(),
      likes: 0,
    };

    // Save comment to database here
    // await this.commentsService.create(comment);

    // Broadcast to all users in the video room
    this.server.to(`video:${data.videoId}`).emit('newComment', comment);

    return { success: true, comment };
  }

  @SubscribeMessage('likeComment')
  @UseGuards(JwtAuthGuard)
  async handleLikeComment(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { commentId: string; videoId: string },
  ) {
    if (!client.userId) {
      return { error: 'Unauthorized' };
    }

    // Update like count in database
    // const updatedComment = await this.commentsService.toggleLike(data.commentId, client.userId);

    // Broadcast like update
    this.server.to(`video:${data.videoId}`).emit('commentLiked', {
      commentId: data.commentId,
      likes: 0, // updatedComment.likes,
      likedBy: client.userId,
    });

    return { success: true };
  }

  @SubscribeMessage('videoProgress')
  handleVideoProgress(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: { videoId: string; currentTime: number; duration: number },
  ) {
    // Track video watch progress for analytics
    // You can save this data for recommendation algorithms
    this.logger.debug(
      `User ${client.userId} progress on video ${data.videoId}: ${data.currentTime}/${data.duration}`,
    );
  }

  // Admin methods
  async broadcastNotification(userId: number, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
    }
  }

  async broadcastToVideoRoom(videoId: string, event: string, data: any) {
    this.server.to(`video:${videoId}`).emit(event, data);
  }

  async getConnectedUsersCount(): Promise<number> {
    return this.connectedUsers.size;
  }

  async getVideoRoomCount(videoId: string): Promise<number> {
    const sockets = await this.server.in(`video:${videoId}`).fetchSockets();
    return sockets.length;
  }
}
