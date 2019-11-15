import request from 'request-promise';
import { UserColumn, UserColumnValue } from '../../db';


export default async (req, res) => {
	const { access_token: accessToken } = await request({
		method: 'POST',
		url: 'https://smartreportz.eu.auth0.com/oauth/token',
		json: true,
		body: {
			client_id: process.env.AUTH0_MANAGEMENT_API_CLIENT_ID,
			client_secret: process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET,
			audience: process.env.AUTH0_MANAGEMENT_API_AUDIENCE,
			grant_type: 'client_credentials',
		},
	});


	// res.json({ token: accessToken });
	// return;
	const columns = await UserColumn.findAll({ where: { isRemoved: false }, raw: true });
	const users = await request({
		method: 'GET',
		url: 'https://smartreportz.eu.auth0.com/api/v2/users',
		headers: {
			authorization: `Bearer ${accessToken}`,
		},
		json: true,
	});
	// res.json({ cols: columns, users: users });
	// const [users, columns] = Promise.all([
	// 	request({
	// 		method: 'GET',
	// 		url: 'https://smartreportz.eu.auth0.com/api/v2/users',
	// 		headers: {
	// 			authorization: `Bearer ${accessToken}`,
	// 		},
	// 		json: true,
	// 	}),
	// 	UserColumn.findAll({
	// 		where: { isRemoved: false },
	// 		raw: true,
	// 	}),
	// ]).then(res => res.json({ data: data, success: res }))
	// 	.catch(error => res.json({ data: data, error: error }));

	const totalColumns = [{
		name: 'email',
		type: 'string',
	},
	...columns.map(({ id, name, type }) => ({
		id,
		name,
		type,
	}))];

	const additionalColumnsValues = await Promise.all(
		columns.map(x => UserColumnValue.findAll({
			where: { columnId: x.id, userId: users.map(c => c.user_id), isRemoved: false },
			raw: true,
		}).then(items => items.reduce((acc, rowValue) => {
			acc[rowValue.userId] = rowValue;
			return acc;
		}, {}))),
	);

	const parseValue = (value, type) => {
		switch (type) {
			case 'boolean': {
				return value === 'true';
			}
			default: {
				return value;
			}
		}
	};
	const totalRows = users.map(c => [{
		value: c.email,
	},
	...columns.map((col, id) => ({
		value: parseValue((additionalColumnsValues[id][c.user_id] || {}).value, col.type),
	}))]);

	const customCellIndexes = Object.assign({}, ...users.map(
		c => ({
			[c.user_id]: Object.assign({}, ...columns.map((x, id) => ({
				[x.id]: (additionalColumnsValues[id][c.user_id] || {}).id,
			}))),
		}),
	));


	res.json({
		rows: [...totalRows],
		rowIndexes: users.map(x => x.user_id),
		customCellIndexes,
		columns: totalColumns,
	});
};
