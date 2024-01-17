import { IApplication, IBaseExtension } from 'ah-server';
import { DataSource, DataSourceOptions } from 'typeorm';

declare module 'ah-server' {
  // eslint-disable-next-line
  interface IApplication {
    ds: DataSource;
    repo: IAppRepoMap;
    initORM: () => Promise<void>;
  }
}

// for declare merge
export interface IAppRepoMap {}

export const createOrmExtension = (opt: DataSourceOptions, createAllRepo: (ds: DataSource) => IAppRepoMap): IBaseExtension => {
  const app = {
    async initORM() {
      const _app: IApplication = this as any;

      // init db
      const ds = await new DataSource(opt).initialize();

      _app.ds = ds;
      _app.repo = createAllRepo(ds);
      _app.logger.info(`db connection created`);
    },
  };

  const lifeCycle: IBaseExtension['lifeCycle'] = {
    setup: async _app => _app.initORM(),
  };

  return { app, lifeCycle };
};

export * from './RepoHelper';
export * from './createCmsServiceFactory';
