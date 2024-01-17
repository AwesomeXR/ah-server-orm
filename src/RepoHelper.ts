import { createBizError } from 'ah-server';
import { DeepPartial, FindManyOptions, FindOneOptions, ObjectLiteral, Repository } from 'typeorm';
import { IPagination } from 'ah-api-type';

export type IFindPageOpt<T, R extends string> = Omit<FindManyOptions<T>, 'skip' | 'take' | 'relations'> & {
  relations?: R[];
};

const getPage = async <T extends ObjectLiteral, R extends string = any>(
  repo: Repository<T>,
  options?: IFindPageOpt<T, R>,
  pagination: IPagination = {}
) => {
  const { pageSize = 20, pageNum = 1, sortField, sortOrder } = pagination;
  const skip = pageSize * (pageNum - 1);
  const take = pageSize;

  // order 优先级: pagination > options
  const order: any =
    sortField && sortOrder
      ? { [sortField]: sortOrder === 'ascend' ? 'ASC' : sortOrder === 'descend' ? 'DESC' : 'ASC' }
      : options?.order || {};

  const [list, total] = await repo.findAndCount({
    ...options,
    order,
    skip,
    take,
  });

  return { total, pageSize, pageNum, list };
};

export type ICmsServiceF1_opt<T, R extends string> = Omit<FindOneOptions<T>, 'relations'> & {
  relations?: R[];
};

export type ICmsServiceFN_opt<T, R extends string> = Omit<FindManyOptions<T>, 'relations'> & {
  relations?: R[];
};

export type ICmsServiceMethod<T, R extends string> = {
  count: (query: ICmsServiceF1_opt<T, R>) => Promise<number>;
  getOne: (query: ICmsServiceF1_opt<T, R>) => Promise<T | null>;
  getOneOrFail: (query: ICmsServiceF1_opt<T, R>) => Promise<T>;
  getPage: (
    query: IFindPageOpt<T, R>,
    pagination?: IPagination | undefined
  ) => Promise<{
    total: number;
    pageSize: number;
    pageNum: number;
    list: T[];
  }>;
  getAll: (query: ICmsServiceFN_opt<T, R>) => Promise<T[]>;
  createOne: (opt: DeepPartial<T>) => Promise<T>;
  updateOne: (id: number, opt: DeepPartial<T>) => Promise<T>;
  removeOne: (query: ICmsServiceF1_opt<T, R>) => Promise<void>;
  getOneOrCreate: (query: ICmsServiceF1_opt<T, R>, create: DeepPartial<T>) => Promise<T>;
};

const createCmsService = <T extends ObjectLiteral, R extends string>(
  repo: Repository<T> | (() => Repository<T>),
  cfg: {
    tapOneQuery?: (q: ICmsServiceF1_opt<T, R>) => Promise<ICmsServiceF1_opt<T, R>>;
    tapPageQuery?: (q: IFindPageOpt<T, R>) => Promise<IFindPageOpt<T, R>>;
    tapModify?: (opt: DeepPartial<T>) => Promise<DeepPartial<T>>;
  } = {}
): ICmsServiceMethod<T, R> => {
  const getRepo = () => (typeof repo === 'function' ? repo() : repo);

  const _getOne = async (query: ICmsServiceF1_opt<T, R>) => {
    const _repo = getRepo();
    if (cfg.tapOneQuery) query = await cfg.tapOneQuery(query);
    return _repo.findOne(query);
  };

  const _getOneOrFail = async (query: ICmsServiceF1_opt<T, R>) => {
    const _repo = getRepo();
    if (cfg.tapOneQuery) query = await cfg.tapOneQuery(query);

    const m = await _repo.findOne(query);
    if (!m) throw createBizError(`${_repo.metadata.name} not exist`);

    return m;
  };

  const _getPage = async (query: IFindPageOpt<T, R>, pagination?: IPagination) => {
    const _repo = getRepo();
    if (cfg.tapPageQuery) query = await cfg.tapPageQuery(query);

    return getPage(_repo, { order: { id: 'DESC' } as any, ...query }, pagination);
  };

  const _getAll = async (query: ICmsServiceFN_opt<T, R>) => {
    const _repo = getRepo();
    return _repo.find(query);
  };

  const _createOne = async (opt: DeepPartial<T>) => {
    const _repo = getRepo();
    if (cfg.tapModify) opt = await cfg.tapModify(opt);
    const m = _repo.create(opt);

    // fix setter 不生效
    Object.assign(m, opt);

    return _repo.save(m);
  };

  const _updateOne = async (id: number, opt: DeepPartial<T>) => {
    const _repo = getRepo();
    const target = await _getOneOrFail({ where: { id } as any });

    if (cfg.tapModify) opt = await cfg.tapModify(opt);

    Object.keys(opt).forEach(k => {
      // 字段黑名单
      if (k === 'id') return;
      if (typeof (opt as any)[k] == 'undefined') return;
      (target as any)[k] = (opt as any)[k];
    });

    return _repo.save(target);
  };

  const _removeOne = async (query: ICmsServiceF1_opt<T, R>) => {
    const _repo = getRepo();
    const target = await _getOne(query);
    if (target) await _repo.remove(target);
  };

  const getOneOrCreate = async (query: ICmsServiceF1_opt<T, R>, create: DeepPartial<T>) => {
    const _repo = getRepo();

    const et = await _getOne(query);
    if (et) return et;

    const nt = _repo.create(create);

    // fix setter 不生效
    Object.assign(nt, create);

    return _repo.save(nt);
  };

  const count = async (query: ICmsServiceF1_opt<T, R>) => {
    const _repo = getRepo();
    return _repo.count(query);
  };

  return {
    getOne: _getOne,
    getOneOrFail: _getOneOrFail,
    getPage: _getPage,
    getAll: _getAll,
    createOne: _createOne,
    updateOne: _updateOne,
    removeOne: _removeOne,
    getOneOrCreate,
    count,
  };
};

export const RepoHelper = {
  getPage,
  createCmsService,
};
