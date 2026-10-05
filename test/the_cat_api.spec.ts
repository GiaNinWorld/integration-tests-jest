import pactum from 'pactum';
import { randomUUID } from 'crypto';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';

describe('The Cat API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://api.thecatapi.com/v1';
  const apiKey = process.env.THE_CAT_API_KEY ?? 'DEMO-API-KEY';
  const subId = `jest-${randomUUID()}`;
  let imageId = '';
  let favouriteId = '';

  p.request.setDefaultTimeout(30000);

  beforeAll(() => p.reporter.add(rep));
  afterAll(async () => {
    try {
      const remainingFavouriteId = await p
        .spec()
        .get(`${baseUrl}/favourites`)
        .withHeaders('x-api-key', apiKey)
        .withQueryParams({ sub_id: subId })
        .returns('[0].id');

      if (remainingFavouriteId) {
        await p
          .spec()
          .delete(`${baseUrl}/favourites/${remainingFavouriteId}`)
          .withHeaders('x-api-key', apiKey);
      }
    } finally {
      await p.reporter.end();
    }
  });

  describe('Images', () => {
    it('buscar uma imagem de gato', async () => {
      imageId = await p
        .spec()
        .get(`${baseUrl}/images/search`)
        .withQueryParams({ limit: 1 })
        .expectStatus(StatusCodes.OK)
        .expectHeaderContains('content-type', 'application/json')
        .expectJsonSchema({
          type: 'array',
          minItems: 1,
          maxItems: 1,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
              width: { type: 'integer' },
              height: { type: 'integer' }
            },
            required: ['id', 'url', 'width', 'height']
          }
        })
        .returns('[0].id');
    });
  });

  describe('Favourites', () => {
    it('adicionar a imagem aos favoritos', async () => {
      await p
        .spec()
        .post(`${baseUrl}/favourites`)
        .withHeaders('x-api-key', apiKey)
        .withJson({ image_id: imageId, sub_id: subId })
        .stores((_, response) => {
          favouriteId = String(response.body.id);
          return {};
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: { type: 'integer' },
            image_id: { type: 'string' },
            sub_id: { type: 'string' },
            created_at: { type: 'string' }
          },
          required: ['id', 'image_id', 'sub_id', 'created_at']
        });
    });

    it('buscar o favorito criado', async () => {
      await p
        .spec()
        .get(`${baseUrl}/favourites/${favouriteId}`)
        .withHeaders('x-api-key', apiKey)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({ image_id: imageId });
    });

    it('remover o favorito criado', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/favourites/${favouriteId}`)
        .withHeaders('x-api-key', apiKey)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({ type: 'object' });

      favouriteId = '';
    });
  });
});
