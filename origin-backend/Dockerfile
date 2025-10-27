# Use Node.js 20 LTS
FROM node:20-alpine

# Install basic tools
RUN apk add --no-cache python3 make g++ libc6-compat

# Create app directory
WORKDIR /app

# Copy essential files only
COPY package.json package-lock.json* ./

# Install minimal dependencies  
RUN npm ci --production --ignore-scripts

# Create a simple server in JavaScript using proper echo commands with demo videos
RUN mkdir -p /app/dist && \
    echo "const http = require('http');" > /app/dist/server.js && \
    echo "const url = require('url');" >> /app/dist/server.js && \
    echo "const server = http.createServer((req, res) => {" >> /app/dist/server.js && \
    echo "  res.setHeader('Access-Control-Allow-Origin', '*');" >> /app/dist/server.js && \
    echo "  res.setHeader('Content-Type', 'application/json');" >> /app/dist/server.js && \
    echo "" >> /app/dist/server.js && \
    echo "  if (req.url === '/health') {" >> /app/dist/server.js && \
    echo "    res.writeHead(200, { 'Content-Type': 'application/json' });" >> /app/dist/server.js && \
    echo "    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));" >> /app/dist/server.js && \
    echo "  } else if (req.url === '/api/videos') {" >> /app/dist/server.js && \
    echo "    const videos = [" >> /app/dist/server.js && \
    echo "      {" >> /app/dist/server.js && \
    echo "        id: 1," >> /app/dist/server.js && \
    echo "        title: \"Big Buck Bunny\"," >> /app/dist/server.js && \
    echo "        description: \"A large and lovable rabbit deals with three tiny rodents.\"," >> /app/dist/server.js && \
    echo "        thumbnail: \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg\"," >> /app/dist/server.js && \
    echo "        videoUrl: \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\"," >> /app/dist/server.js && \
    echo "        views: 2543000," >> /app/dist/server.js && \
    echo "        createdAt: new Date('2024-01-15').toISOString()" >> /app/dist/server.js && \
    echo "      }," >> /app/dist/server.js && \
    echo "      {" >> /app/dist/server.js && \
    echo "        id: 2," >> /app/dist/server.js && \
    echo "        title: \"Elephant Dream\"," >> /app/dist/server.js && \
    echo "        description: \"Two characters find a mysterious elephant.\"," >> /app/dist/server.js && \
    echo "        thumbnail: \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg\"," >> /app/dist/server.js && \
    echo "        videoUrl: \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\"," >> /app/dist/server.js && \
    echo "        views: 1832000," >> /app/dist/server.js && \
    echo "        createdAt: new Date('2024-02-10').toISOString()" >> /app/dist/server.js && \
    echo "      }," >> /app/dist/server.js && \
    echo "      {" >> /app/dist/server.js && \
    echo "        id: 3," >> /app/dist/server.js && \
    echo "        title: \"Sintel\"," >> /app/dist/server.js && \
    echo "        description: \"A young woman becomes a warrior to find her dragon.\"," >> /app/dist/server.js && \
    echo "        thumbnail: \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg\"," >> /app/dist/server.js && \
    echo "        videoUrl: \"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4\"," >> /app/dist/server.js && \
    echo "        views: 3421000," >> /app/dist/server.js && \
    echo "        createdAt: new Date('2024-03-05').toISOString()" >> /app/dist/server.js && \
    echo "      }" >> /app/dist/server.js && \
    echo "    ];" >> /app/dist/server.js && \
    echo "    res.writeHead(200, { 'Content-Type': 'application/json' });" >> /app/dist/server.js && \
    echo "    res.end(JSON.stringify(videos));" >> /app/dist/server.js && \
    echo "  } else {" >> /app/dist/server.js && \
    echo "    res.writeHead(404, { 'Content-Type': 'application/json' });" >> /app/dist/server.js && \
    echo "    res.end(JSON.stringify({ error: 'Not Found' }));" >> /app/dist/server.js && \
    echo "  }" >> /app/dist/server.js && \
    echo "});" >> /app/dist/server.js && \
    echo "" >> /app/dist/server.js && \
    echo "const PORT = process.env.PORT || 8080;" >> /app/dist/server.js && \
    echo "server.listen(PORT, () => {" >> /app/dist/server.js && \
    echo "  console.log('🚀 Origin Backend running on port ' + PORT);" >> /app/dist/server.js && \
    echo "});" >> /app/dist/server.js

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Create uploads directory
RUN mkdir -p /app/uploads/videos /app/uploads/thumbnails

# Set permissions
RUN chown -R nodejs:nodejs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Environment variables
ENV NODE_ENV production
ENV PORT 8080

# Run the server
CMD ["node", "/app/dist/server.js"]
