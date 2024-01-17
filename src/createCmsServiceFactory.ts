import { BaseService, IApplication, IBaseService } from 'ah-server';
import { ICmsServiceMethod, RepoHelper } from './RepoHelper';
import { ObjectLiteral, Repository } from 'typeorm';

export type ICmsService<T, R extends string> = IBaseService & ICmsServiceMethod<T, R>;
export type ICmsServiceCls<T, R extends string> = {
  new (app: IApplication): ICmsService<T, R>;
};

export const createCmsServiceFactory = <T extends ObjectLiteral, R extends string>(
  getRepo: (app: IApplication) => Repository<T>
): ICmsServiceCls<T, R> => {
  class CmsService extends BaseService {
    private ss = RepoHelper.createCmsService(() => getRepo(this.app));

    createOne = this.ss.createOne.bind(this.ss);
    getOne = this.ss.getOne.bind(this.ss);
    getOneOrCreate = this.ss.getOneOrCreate.bind(this.ss);
    getOneOrFail = this.ss.getOneOrFail.bind(this.ss);
    getPage = this.ss.getPage.bind(this.ss);
    removeOne = this.ss.removeOne.bind(this.ss);
    updateOne = this.ss.updateOne.bind(this.ss);
  }

  return CmsService as any;
};
