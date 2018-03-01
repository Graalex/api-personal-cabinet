const fb = require('node-firebird');
const cp1251 = require('windows-1251');

const options = require('../config').db;

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
			
			const query = `
				select a.peracc, et.name as "EQ_TYPE", ek.name as "EQ_NAME"
	      from change c
	      join equipment e on c.changekey = e.changer
				join eqtype et on e.eqtyper = et.eqtypekey
				join eqkind ek on e.eqkindr = ek.eqkindkey
				join abon a on a.kod = c.kodr
				where c.datic = (select first 1 max(datic) from change where kodr = c.kodr) and a.peracc = ${fb.escape(ls)}
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
				
				let equipments = [];
				result.map(item => {
					equipments.push(`${cp1251.decode(item.EQ_TYPE.toString('binary')).trim()} (${cp1251.decode(item.EQ_NAME.toString('binary')).trim()})`);
				});
				db.detach();
				
				return resolve(equipments.join('; '));
			});
		});
	});
};

const benefitsInfo = (pool, ls) => {
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
			
			let query = `
				select first 1 pt.percentage as "KIND", pp.privpeopcnt as "COUNT"
				from privnormainfo pn
				left join privtype pt on pt.privtypekey = pn.privtyper
				left join privpart pp on pp.privpartkey = pn.privpartr
				left join abon a on a.kod = pn.kodr
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
				
				let benefits = {};
				if (result.length > 0) {
					let val = result[0];
					benefits.benefitsKind = val.KIND == 0 ? '' : val.KIND;
					benefits.benefitsPersons = val.COUNT === null ? 0 : val.COUNT;
				}
				db.detach();
				
				return resolve(benefits);
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

const getAccountInfo = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		const info = await accountInfo(pool, ls);
		const equipments = await equipmentsInfo(pool, ls);
		const benefits = await benefitsInfo(pool, ls);
		
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: {currentDate: new Date(), ...info, equipments, ...benefits},
		};
	}
	
	catch (err) {
		return err;
	}
	
	finally {
		pool.destroy();
	}
};

const getAllocations = async ls => {
	const pool = fb.pool(4, options);
	
	try {
		if (!ls || ls <= 0)
			throw {
				status: 404,
				message: 'Неверный лицевой счет.',
				data: {ls},
		};
		
		const allocations = await allocByMonth(pool, ls);
		const corrections = await correctByMonth(pool, ls);
		
		return {
			status: 200,
			message: 'Успешное завершение запроса',
			data: {allocatoins: [...allocations], corrections: [...corrections]},
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

module.exports.getAccountInfo = getAccountInfo;
module.exports.getAllocations = getAllocations;
module.exports.getSubsidies = getSubsidies;
module.exports.getPayments = getPayments;
module.exports.getMeters = getMeters;