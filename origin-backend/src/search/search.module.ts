import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        node: configService.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
        auth: {
          username: configService.get('ELASTICSEARCH_USERNAME', 'elastic'),
          password: configService.get('ELASTICSEARCH_PASSWORD', 'changeme'),
        },
        maxRetries: 10,
        requestTimeout: 60000,
        pingTimeout: 60000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
