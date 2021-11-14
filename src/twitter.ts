// import AbortController from 'abort-controller';
import axios from 'axios';
import { URL } from 'url';

import Credentials, { CredentialsArgs } from './Credentials';
import TwitterError from './TwitterError.js';
import TwitterStream, { StreamOptions } from './TwitterStream';
// import {Writable, Readable, WritableOptions} from 'stream'

export declare interface RequestParameters {
  [key: string]: string | Array<string> | RequestParameters;
}

function applyParameters(
  url: URL,
  parameters?: RequestParameters,
  prefix?: string
) {
  prefix = prefix || '';

  if (!parameters) {
    return;
  }

  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value == 'object' && value instanceof Array) {
      url.searchParams.set(prefix + key, value.join(','));
    } else if (typeof value == 'object') {
      applyParameters(url, value, `${prefix}${key}.`);
    } else {
      url.searchParams.set(prefix + key, value);
    }
  }
}

export default class Twitter {
  public credentials: Credentials;

  constructor(args: CredentialsArgs) {
    this.credentials = new Credentials(args);
  }

  async get<T extends any>(
    endpoint: string,
    parameters?: RequestParameters
  ): Promise<T> {
    const url = new URL(`https://api.twitter.com/2/${endpoint}`);
    applyParameters(url, parameters);

    const { data } = await axios(url.toString(), {
      headers: {
        Authorization: await this.credentials.authorizationHeader(url, {
          method: 'GET',
        }),
      },
    });

    const error = TwitterError.fromJson(data);
    if (error) {
      throw error;
    }

    return data;
  }

  async post<T extends any>(
    endpoint: string,
    body: object,
    parameters?: RequestParameters
  ): Promise<T> {
    const url = new URL(`https://api.twitter.com/2/${endpoint}`);
    applyParameters(url, parameters);

    const { data } = await axios(url.toString(), {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: await this.credentials.authorizationHeader(url, {
          method: 'POST',
          body: body,
        }),
      },
      data: JSON.stringify(body || {}),
    });

    const error = TwitterError.fromJson(data);
    if (error) {
      throw error;
    }

    return data;
  }

  async delete<T extends any>(
    endpoint: string,
    parameters?: RequestParameters
  ): Promise<T> {
    const url = new URL(`https://api.twitter.com/2/${endpoint}`);
    applyParameters(url, parameters);

    const { data } = await axios(url.toString(), {
      method: 'delete',
      headers: {
        Authorization: await this.credentials.authorizationHeader(url, {
          method: 'DELETE',
        }),
      },
    });

    const error = TwitterError.fromJson(data);
    if (error) {
      throw error;
    }

    return data;
  }

  stream<T extends any>(
    endpoint: string,
    parameters?: RequestParameters,
    options: StreamOptions = {}
  ): TwitterStream {
    const abortController = axios.CancelToken.source();

    return new TwitterStream(
      async () => {
        const url = new URL(`https://api.twitter.com/2/${endpoint}`);
        applyParameters(url, parameters);

        return await axios(url.toString(), {
          cancelToken: abortController.token,
          responseType: 'stream',
          headers: {
            Authorization: await this.credentials.authorizationHeader(url, {
              method: 'GET',
            }),
          },
        });
      },
      () => {
        abortController.cancel();
      },
      options || {}
    );
  }
}

module.exports = Twitter;
