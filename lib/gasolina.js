const fb = require('node-firebird');
const cp1251 = require('windows-1251');

const options = require('../config').db;
const appKeys = require('../config').security.appKeys;
const createToken = require('./authorization').createToken;

const accountInfo = (pool, ls) => {
	return new Promise((resolve, reject) => {
		if (!ls)
			return reject({
				status: 400,
				message: 'Недопустимое значение лицевого счета',
				data: {ls},
			});
		
		pool.get((err, db) => {
			if (err)
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера',
					data: {
						code: err.code,
						op: err.syscall,
					},
				});
			
			const query = `
				select first 1
				a.peracc, a.eic, a.name, a.firstname, a.patronymic, i.name as "cityType",
				c.name as "city", st.name as "strType", s.name as "street", a.buildnum, a.buildlitter,
				a.apartmentnum, a.apartmentlitter, m.name as "rayon", ct.name as "counter", cnt.serial,
				ch.square, ch.peoplecnt,
				ad.profilenum as "group", ad.comment as "groupName", am.monthcoef1, am.monthcoef2,
				am.monthcoef3, am.monthcoef4, am.monthcoef5, am.monthcoef6, am.monthcoef7, am.monthcoef8,
				am.monthcoef9, am.monthcoef10, am.monthcoef11, am.monthcoef12
				from abon a
				left join street s on s.streetkey = a.streetr
				left join microrajon m on m.microrajonkey = a.microrajonsr
				left join counter cnt on cnt.ownerkodr = a.kod
				left join (
					select ap.datic, ap.kodr, ap.abonprofiledirr
					from abonprofiles ap
					where ap.datic = (select first 1 max(datic) from abonprofiles where kodr=ap.kodr and isbadv = 0)
				) ap on a.kod = ap.kodr
				join (
					select ch.kodr, ch.square, ch.peoplecnt
					from change ch
					where ch.datic = (select first 1 max(datic) from change where kodr = ch.kodr)
				) ch on ch.kodr = a.kod
				left join abonprofiledir ad on ad.abonprofiledirkey = ap.abonprofiledirr
				left join abonprofilemonthcoef am on am.abonprofiledirr = ad.abonprofiledirkey
				left join countertype ct on ct.countertypekey = cnt.countertyper
				left join streettype st on st.streettypekey = s.streettyper
				left join city c on c.citykey = s.cityr
				left join inhabitedlocalitytype i on i.inhabitedlocalitytypekey = c.inhabitedlocalitytyper
				where a.peracc = ${fb.escape(ls)}
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall
						}
					});
				}
				
				// если получили пустой результат, то нет такого лицевого счета
				if (result.length == 0) {
					db.detach();
					return reject({
						status: 404,
						message: 'Неверный лицевой счет.',
						data: {ls},
					});
				}
				
				let val = result[0];
				
				// начинаем строить ответ
				// адресная строка
				let adr = [
					val.cityType !== null ? cp1251.decode(val.cityType.toString('binary')).trim() : '',
					cp1251.decode(val.city.toString('binary')).trim() + ',',
					cp1251.decode(val.rayon.toString('binary')).trim(),
					'р-н,',
					val.strType !== null ? cp1251.decode(val.strType.toString('binary')).trim().toLowerCase() : '',
					cp1251.decode(val.street.toString('binary')).trim() + ',',
					'д.',
					val.BUILDNUM,
					val.BUILDLITTER !== null ? cp1251.decode(val.BUILDLITTER.toString('binary')).trim() : '',
					val.APARTMENTNUM !== null ? ` кв. ${val.APARTMENTNUM}` : ''
				].join(' ');
				
				let content = {};
				content.ls = parseInt(val.PERACC.toString().trim());
				content.eic = val.EIC.toString().trim();
				content.family = cp1251.decode(val.NAME.toString('binary')).trim();
				content.name = val.FIRSTNAME !== null ? cp1251.decode(val.FIRSTNAME.toString('binary')).trim() : '';
				content.patronymic = val.PATRONYMIC !== null ? cp1251.decode(val.PATRONYMIC.toString('binary')).trim() : '';
				content.address = adr;
				content.meter = val.counter !== null ? cp1251.decode(val.counter.toString('binary')).trim() : null;
				content.meterNumb = val.SERIAL !== null ? cp1251.decode(val.SERIAL.toString('binary')).trim() : null;
				content.group = val.group;
				content.groupName = val.groupName !== null ? cp1251.decode(val.groupName.toString('binary')).trim() : null;
				content.heatedArea = val.SQUARE;
				content.registeredPersons = val.PEOPLECNT;
				content.powers = [
					val.MONTHCOEF1,
					val.MONTHCOEF2,
					val.MONTHCOEF3,
					val.MONTHCOEF4,
					val.MONTHCOEF5,
					val.MONTHCOEF6,
					val.MONTHCOEF7,
					val.MONTHCOEF8,
					val.MONTHCOEF9,
					val.MONTHCOEF10,
					val.MONTHCOEF11,
					val.MONTHCOEF12,
				];
				
				db.detach();
				return resolve(content);
			});
		})
	});
};

const currentPrice = pool => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					}
				});
			}
			
			const query = `
				select first 1 p.datic, p.pricewinterbeforelimit as price
				from priceeu p
				order by p.datic desc
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall
						}
					});
				}
				
				db.detach();
				
				const price = result[0].PRICE;
				return resolve(price);
			});
		});
	});
};

const currentSaldo = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					}
				});
			}
			
			const query = `
				select coalesce(a.saldo,0) as beginsaldo, coalesce(nac.sumic,0) as nac, coalesce(kor.sumic,0) as kor,
					coalesce(opl.sumic,0) as opl, coalesce(subs.sumic,0) as subs,
					(coalesce(a.saldo,0) + coalesce(nac.sumic,0) + coalesce(kor.sumic,0) - coalesce(opl.sumic,0) - coalesce(subs.sumic,0) ) as saldo
				from abon a
				full outer join (
					select c.kodr, sum(c.sumic) as sumic
					from abon a
					join calc c on a.kod = c.kodr
					where a.peracc = ${fb.escape(ls)} and c.gasvendorcompanyr=2
					group by c.kodr
				) nac on a.kod=nac.kodr
        full outer join (
          select c.kodr, sum(c.sumic) as sumic
          from abon a
          join correct c on a.kod = c.kodr
          where a.peracc = ${fb.escape(ls)} and c.gasvendorcompanyr=2
          group by c.kodr
        ) kor on a.kod=kor.kodr
        full outer join (
          select c.kodr, sum(c.sumic) as sumic
          from abon a
          join payment c on a.kod = c.kodr
          where a.peracc = ${fb.escape(ls)} and c.ischecked = 1 and c.gasvendorcompanyr=2
          group by c.kodr
        ) opl on a.kod=opl.kodr
        full outer join (
          select c.kodr, sum(c.sumic) as sumic
          from abon a
          join subsidy c on a.kod = c.kodr
          where a.peracc = ${fb.escape(ls)} and c.ischecked = 1 and c.gasvendorcompanyr=2
          group by c.kodr
        ) subs on a.kod=subs.kodr
				where a.peracc=${fb.escape(ls)}
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall,
						}
					});
				}
				
				db.detach();
				const saldo = {
					beginSaldo: result[0].BEGINSALDO,
					accrual: result[0].NAC,
					correction: result[0].KOR,
					payment: result[0].OPL,
					subsidie: result[0].SUBS,
					saldo: result[0].SALDO,
				};
				
				return resolve(saldo);
			});
		});
	});
};

const equipmentsInfo = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) =>{
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall
					}
				});
			}
			
			/*
			const query = `
				select ch.peracc,ch.kodr, pt.name,p.cnt,p.bynorma,ek.name as name2,p.justoff
				from equipment p join (
					select a.peracc, c.*
					from change c
					join (
						select kodr, max(datic) as datic from change group by kodr
					) m on c.kodr=m.kodr and c.datic=m.datic
					join abon a on c.kodr=a.kod
					where a.peracc=${fb.escape(ls)}
				) ch on p.changer=ch.changekey
				join eqtype pt on p.eqtyper=pt.eqtypekey
				join eqkind ek on p.eqkindr=ek.eqkindkey
			`;
			*/
			
			const query = `
				select pt.name, p.cnt, ek.name as name2, p.justoff
				from equipment p
				join (
					select a.peracc, c.*
					from change c
					join (
						select c.kodr, max(c.datic) as datic
						from change c
						join abon a on c.kodr=a.kod
						where a.peracc = ${fb.escape(ls)}
						group by kodr
					) m on c.kodr = m.kodr and c.datic = m.datic
					join abon a on c.kodr=a.kod
					where a.peracc = ${fb.escape(ls)}
				) ch on p.changer = ch.changekey
				join eqtype pt on p.eqtyper = pt.eqtypekey
				join eqkind ek on p.eqkindr = ek.eqkindkey
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall
						}
					});
				}
				
				db.detach();
				const equipments = result.map(item => (
					{
						type: cp1251.decode(item.NAME.toString('binary')).trim(),
						name: cp1251.decode(item.NAME2.toString('binary')).trim(),
						quantity: item.CNT,
						justoff: item.JUSTOFF === 1,
					}
				));
				
				return resolve(equipments);
			});
		});
	});
};

const beneficiariesInfo = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall
					}
				});
			}
			
			const query = `
				select ch.peracc, pt.name as lgname, pt.percentage as lgprc, p.privpeopcnt as lgkol, p.privtaxid as lginn,
					p.privpeopname as lglastname, p.privpeopfirstname as lgfirstname,p.privpeoppatronymic as lgoth
				from privpart p join (
					select a.peracc, c.*
					from change c  join (select kodr, max(datic) as datic from change group by kodr) m on c.kodr=m.kodr and c.datic=m.datic
					join abon a on c.kodr=a.kod
					where a.peracc=${fb.escape(ls)}
				) ch on p.changer=ch.changekey
				join privtype pt on p.privtyper=pt.privtypekey
				where p.privpeopcnt<>0
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall
						}
					});
				}
				
				 const beneficiaries = result.map(item => ({
					type: cp1251.decode(item.LGNAME.toString('binary')).trim(),
					percent: item.LGPRC,
					quantity: item.LGKOL,
					inn: item.LGINN ? cp1251.decode(item.LGINN.toString('binary')).trim() : '',
					family: item.LGLASTNAME ? cp1251.decode(item.LGLASTNAME.toString('binary')).trim() : '',
					name: item.LGFIRSTNAME ? cp1251.decode(item.LGFIRSTNAME.toString('binary')).trim() : '',
					patronymic: item.LGOTH ? cp1251.decode(item.LGOTH.toString('binary')).trim() : '',
				}));
				
				db.detach();
				
				return resolve(beneficiaries);
			});
		});
	});
};

const allocByMonth = (pool, ls) => {
	return new Promise((resolve, reject) => {
		// подключаем пулл к базе данных Firebird
		pool.get((err, db) => {
			if (err)
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					},
				});
			
			// формируем и выполняем запрос
			const query = `
				select ss.year_s,ss.month_s, sum(ss.sumic) as sumic, sum(ss.retsum) as retsum, sum(v) as v
				from (
					select a.peracc, c.calcdate, extract (month from c.calcdate) as month_s,
						extract(year from c.calcdate) as year_s, c.sumic, c.retsum, c.v, c.begindate,c.enddate
					from calc c
					join abon a on a.kod = c.kodr
					where a.peracc = ${fb.escape(ls)} and c.gasvendorcompanyr=2
					order by year_s, month_s, c.calcdate
				) ss
				group by ss.peracc,ss.year_s,ss.month_s
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall
						}
					});
				}
				db.detach();
				
				// формируем ответ
				const allocations = result.map(item => ({
					year: item.YEAR_S,
					month: item.MONTH_S,
					total: item.SUMIC,
					volume: item.V,
				}));
				return resolve(allocations);
			});
		});
	});
};

const correctByMonth = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					},
				});
			}
			
			const query = `
				select ss.year_s,ss.month_s, sum(ss.sumic) as sumic, sum(ss.retsum) as retsum, sum(v) as v
				from (
					select a.peracc, c.datic, extract (month from c.datic) as month_s, extract(year from c.datic) as year_s,
						c.sumic, c.retsum, c.v, c.begindate,c.enddate
					from correct c
					join abon a on a.kod = c.kodr
					where a.peracc = ${fb.escape(ls)} and c.gasvendorcompanyr=2
					order by year_s, month_s, c.datic
				) ss
				group by ss.peracc,ss.year_s,ss.month_s
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall
						}
					});
				}
				
				db.detach();
				const corrections = result.map(item => ({
					year: item.YEAR_S,
					month: item.MONTH_S,
					amount: item.SUMIC,
					volume: item.V,
				}));
				
				return resolve(corrections);
			});
		});
	});
};

const subsidiesByMonth = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					},
				});
			}
			
			const query = `
				select ss.year_s,ss.month_s, sum(ss.sumic) as sumic
				from (
						select a.peracc, s.datic, extract (month from s.datic) as month_s,
							extract(year from s.datic) as year_s, s.sumic
					from subsidy s
					join abon a on a.kod = s.kodr
					where a.peracc = ${fb.escape(ls)} and s.ischecked =1
				) ss
				group by ss.peracc,ss.year_s,ss.month_s
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall,
						},
					});
				}
				
				db.detach();
				const subsidies = result.map(item => ({
					year: item.YEAR_S,
					month: item.MONTH_S,
					sum: item.SUMIC,
				}));
				
				return resolve(subsidies);
			});
		});
	});
};

const paymentsByMonth = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					},
				});
			}
			
			const query = `
				select ss.year_s,ss.month_s, sum(ss.sumic) as sumic
				from (
					select a.peracc, p.datic, extract(month from p.datic) as month_s,
						extract(year from p.datic) as year_s, p.sumic
					from payment p
					join abon a on a.kod = p.kodr
					where a.peracc = ${fb.escape(ls)} and p.ischecked = 1 and p.gasvendorcompanyr=2
				) ss
				group by ss.peracc,ss.year_s,ss.month_s
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall,
						},
					});
				}
				
				db.detach();
				const payments = result.map(item =>({
					year: item.YEAR_S,
					month: item.MONTH_S,
					amount: item.SUMIC,
				}));
				
				return resolve(payments);
			});
		});
	});
};

const metersByMonth = (pool, ls) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 500,
					message: 'Внутренняя ошибка сервера.',
					data: {
						code: err.code,
						op: err.syscall,
					}
				});
			} // if
			
			const query = `
				select ss.year_s,ss.month_s, sum(ss.v) as v
				from (
					select a.peracc, v.checkdate, extract (month from v.checkdate) as month_s, extract(year from v.checkdate) as year_s,
					round (v.vdiffer,0) as v, vs.name as vsname,c.initvalue, ct.name, c.serial
					from valuic v
					join abon a on a.kod = v.kodr
					join valuesource vs on v.sourcer=vs.valuesourcekey
					join counter c join countertype ct on c.countertyper=ct.countertypekey  on v.counterr=c.counterkey
					where a.peracc = ${fb.escape(ls)} and v.ischecked=1
					order by year_s, month_s, v.checkdate
				) ss
				group by ss.peracc,ss.year_s,ss.month_s
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall,
						}
					});
				} // if
				
				db.detach();
				const meters = result.map(item => ({
					year: item.YEAR_S,
					month: item.MONTH_S,
					volume: item.V,
				}));
				
				return resolve(meters);
			});
		});
	});
};

const verifyAbonent = (pool, ls, family) => {
	return new Promise((resolve, reject) => {
		pool.get((err, db) => {
			if (err) {
				return reject({
					status: 503,
					message: 'Сервер недоступен.',
					data: {
						code: err.code,
						op: err.syscall,
					}
				})
			} // if (err)
			
			const query = `
				select peracc, name, firstname, patronymic
				from abon
				where peracc = ${fb.escape(ls)}
			`;
			
			db.query(query, (err, result) => {
				if (err) {
					db.detach();
					return reject({
						status: 500,
						message: 'Внутренняя ошибка сервера.',
						data: {
							code: err.code,
							op: err.syscall,
						},
					})
				} // if (err)
				db.detach();
				
				if (result.length === 0) {
					return reject({
						status: 400,
						message: 'Неправильный номер лицевого счета',
					});
				}
				
				// проверяем существует ли такой лицевой счет
				const abonent = {
					ls: result[0].PERACC ? parseInt(result[0].PERACC.toString().trim(), 10) : undefined,
					family: result[0].NAME ? cp1251.decode(result[0].NAME.toString('binary').trim()): undefined,
					name: result[0].FIRSTNAME ? cp1251.decode(result[0].FIRSTNAME.toString('binary').trim()) : '',
					patronymic: result[0].PATRONYMIC ? cp1251.decode(result[0].PATRONYMIC.toString('binary').trim()) : ''
					
				};
				
				// проверяем на соответсвие фамилии
				const pattern = RegExp(`^${abonent.family}`, 'i');
				if (!pattern.test(family)) {
					return reject({
						status: 400,
						message: 'Неверная фамилия абонента.',
					});
				}
				
				return resolve(abonent);
				
			})  // db.query
		}); // pool.get
	}); // new Promise
};

const verifyAppKey = async key => {
	const item = appKeys.find(el => el.key === key);
	if (!item) {
		throw {
			status: '403',
			message: 'Неверный ключ приложения.',
		};
	}
	return item.owner;
};

const getAccountInfo = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		const info = await accountInfo(pool, ls);
		
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: {currentDate: new Date(), ...info},
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getBeneficiaries = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		const beneficiaries = await beneficiariesInfo(pool, ls);
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: beneficiaries,
		}
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getEquipments = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		const equipments = await equipmentsInfo(pool, ls);
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: equipments,
		}
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getAllocations = async ls => {
	const pool = fb.pool(5, options);
	
	try {
		if (!ls || ls <= 0)
			throw {
				status: 404,
				message: 'Неверный лицевой счет.',
				data: {ls},
		};
		
		const allocations = await allocByMonth(pool, ls);
		const corrections = await correctByMonth(pool, ls);
		const price = await currentPrice(pool);
		const balance = await currentSaldo(pool, ls);
		
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: {allocations, corrections, price, balance},
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getSubsidies = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		if (!ls || ls <= 0) {
			throw {
				status: 404,
				message: 'Неверный лицевой счет.',
				data: {ls},
			};
		}
		
		const subsidies = await subsidiesByMonth(pool, ls);
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: subsidies,
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getPayments = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		if (!ls || ls <= 0) {
			throw {
				status: 404,
				message: 'Неверный лицевой счет.',
				data: {ls},
			};
		}
		
		const payments = await paymentsByMonth(pool, ls);
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: payments,
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getMeters = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		if (!ls || ls <= 0) {
			throw {
				status: 404,
				message: 'Неверный лицевой счет.',
				data: {ls},
			};
		}
		
		const meters = await metersByMonth(pool, ls);
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: meters,
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const authAbonent = async ({ls, family, key}) => {
	const pool = fb.pool(4, options);
	
	try {
		// проверяем допустимость парамметров
		const owner = await verifyAppKey(key);
		const abonent = await verifyAbonent(pool, ls, family);
		const token = await createToken(abonent.ls, owner);
		
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: token,
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

module.exports.getAccountInfo = getAccountInfo;
module.exports.getAllocations = getAllocations;
module.exports.getSubsidies = getSubsidies;
module.exports.getPayments = getPayments;
module.exports.getMeters = getMeters;
module.exports.authAbonent = authAbonent;
module.exports.getBeneficiaries = getBeneficiaries;
module.exports.getEquipments = getEquipments;