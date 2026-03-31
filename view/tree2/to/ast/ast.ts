namespace $ {
	const err = $mol_view_tree2_error_str

	const Type = (tree: $mol_tree2, type: Property['type']) => [tree.struct('type', [tree.data(type)])]
	const Literal = (tree: $mol_tree2) => [...Type(tree, types.literal), tree.struct(`raw`, [tree])]
	const Const = (tree: $mol_tree2, raw?: string) => [
		...Type(tree, types.const),
		tree.struct(`raw`, [tree.data(raw ?? tree.type)]),
	]
	const Null = (tree: $mol_tree2) => [
		...Type(tree, types.literal),
		tree.struct(`raw`, [tree]),
		...(tree.kids.length > 0
			? [
					tree.struct(`hint`, [
						array(
							tree,
							tree.kids.map(k => k.data(k.type)),
						),
					]),
				]
			: []),
	]
	const Class = (tree: $mol_tree2, parent: $mol_tree2, props: $mol_tree2[]) => [
		...Type(tree, types.class),
		tree.struct('extends', [parent.data(parent.type)]),
		tree.struct('properties', [object(parent, props)]),
	]
	function Property(this: $, tree: $mol_tree2, other: $mol_tree2[] = []) {
		const { name, key, next } = parts.call(this, tree)
		return tree.struct(name, [
			object(tree, [
				...other,
				...Key.call(this, tree, true),
				...(next ? [tree.struct('writable', [tree.struct('true')])] : []),
			]),
		])
	}

	function parts(this: $, prop: $mol_tree2) {
		return this.$mol_view_tree2_prop_parts(prop)
	}

	const array = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('/', items)
	const object = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('*', items)

	function Key(this: $, tree: $mol_tree2, parent: boolean) {
		const { key } = parts.call(this, tree)
		return key
			? [
					tree.struct((parent ? 'parent_' : '') + 'key', [
						key.length === 1 ? tree.struct('true', []) : tree.data(key.slice(1)),
					]),
				]
			: []
	}
	const Arrow = (type: (typeof types)['bidi'] | (typeof types)['put']) =>
		function (this: $, tree: $mol_tree2, parent: $mol_tree2) {
			const { name, key: k } = parts.call(this, tree.kids[0])
			return [
				...Type(tree, type),
				tree.struct('property', [tree.data(name)]),
				...Key.call(this, tree.kids[0], false),
				...Key.call(this, parent, true),
			]
		}

	export function $mol_view_tree2_to_ast(this: $, tree: $mol_tree2) {
		const descr = this.$mol_view_tree2_classes(tree)

		const classes = descr.kids.map(klass => {
			const parent = this.$mol_view_tree2_child(klass)
			const props = this.$mol_view_tree2_class_props(klass)
			return klass.struct(klass.type, [
				object(
					klass,
					Class(
						klass,
						parent,
						props.map(prop => {
							const { name } = parts.call(this, prop)
							const extend = (tree: $mol_tree2) => {
								if (tree.type === '^') {
									const prop = tree.kids[0]
									if (!prop) return object(tree, [tree.struct('extend', [tree.struct('null')])])
									const { name } = parts.call(this, prop)
									return object(tree, [
										tree.struct('extend', [tree.data(name)]),
										...Key.call(this, prop, false),
									])
								}
							}
							const val = prop.hack(
								{
									true: Literal,
									false: Literal,
									null: Null,
									'=': v => {
										const path = []
										let kid = v.kids[0]
										while (kid) {
											let { name } = parts.call(this, kid)
											path.push(kid.data(name))
											kid = kid.kids[0]
										}
										return [...Type(v, types.pull), v.struct('path', [array(v, path)])]
									},
									'<=': v => Arrow(types.put).call(this, v, prop),
									'<=>': v => Arrow(types.bidi).call(this, v, prop),
									'@': (v, b, { chain }) => [
										...Type(v, types.i18n),
										v.struct(`raw`, v.kids),
										v.struct('id', [
											v.data(`${klass.type}_${name}${chain.length ? `_${chain}` : ''}`),
										]),
									],
									'': (input, belt, context) => {
										if (input.type[0] === '*') {
											return [
												...Type(input, types.dictionary),
												input.struct('properties', [
													array(
														input,
														input.kids.map(
															k =>
																extend(k) ??
																array(k, [
																	k.data(k.type),
																	object(
																		k,
																		k.kids.flatMap(k =>
																			k.hack_self(belt, {
																				...context,
																				chain: [
																					...(context.chain ?? []),
																					k.type.replace(/\?\w*$/, ''),
																				],
																			}),
																		),
																	),
																]),
														),
													),
												]),
												...(input.type.length > 1
													? [
															input.struct('hint', [
																array(input, [input.data(input.type.substring(1))]),
															]),
														]
													: []),
											]
										}
										if (input.type[0] === '/') {
											return [
												...Type(input, types.list),
												input.struct('items', [
													array(
														input,
														input.kids
															.map(
																k =>
																	extend(k) ?? [
																		object(k, k.hack_self(belt, context)),
																	],
															)
															.flat(),
													),
												]),
												...(input.type.length > 1
													? [
															input.struct('hint', [
																array(input, [input.data(input.type.substring(1))]),
															]),
														]
													: []),
											]
										}
										if (input.type && /^-?\d+(\.\d+)?$/.test(input.type)) return Literal(input)
										if ($mol_view_tree2_class_match(input)) {
											const overrides = input.kids
												.filter(over => {
													if (over.type[0] === '/') return false
													const bind = over.kids[0]
													if (bind.type === '=>') return false
													return true
												})
												.map(over =>
													Property.call(this, over, over.hack(belt, { chain: [over.type] })),
												)

											return Class(input, input, overrides)
										}
										if (input.value || (!input.value && !input.type)) return Literal(input)
										return Const(input)
									},
								},
								{ chain: [] as string[] },
							)

							return Property.call(this, prop, val)
						}),
					),
				),
			])
		})

		const ast = object(descr, classes)
		let json: $mol_view_tree2_ast
		try {
			json = this.$mol_tree2_to_json(ast) as any
		} catch (e) {
			throw ast
		}

		Object.entries(json).forEach(([r, root]) => {
			Object.entries(root.properties).forEach(([p, prop]) => {
				if (prop.type === types.bidi) {
					prop.writable = true
					const property = root.properties[prop.property]
					if (property) {
						property.writable = true
						property.key = prop.key
					} else {
						root.properties[prop.property] = {
							type: 'literal',
							raw: null,
							writable: true,
							key: prop.key || prop.parent_key,
						}
					}
				} else if (prop.type === types.list) {
					prop.items.forEach(inner => {
						if ('extend' in inner) {
							if (!inner.extend) return
							const property = root.properties[inner.extend]
							if (!property) {
								root.properties[inner.extend] = {
									type: 'literal',
									raw: null,
									hint: prop.hint,
									key: inner.key,
								}
							}
							return
						}
						if (inner.type === types.put) {
							const property = root.properties[inner.property]
							if (!property) {
								root.properties[inner.property] = {
									type: 'literal',
									raw: null,
									hint: prop.hint,
									key: (inner as any).key,
								}
							}
						}
					})
				} else if (prop.type === types.class) {
					Object.entries(prop.properties).forEach(([i, inner]) => {
						switch (inner.type) {
							case types.bidi: {
								const property = root.properties[inner.property]
								if (property) {
									property.writable = true
									property.key = inner.key
								} else
									root.properties[inner.property] = {
										type: 'literal',
										raw: null,
										hint: [prop.extends, i],
										writable: true,
										key: inner.key || inner.parent_key,
									}
								break
							}
							case types.put: {
								const property = root.properties[inner.property]
								if (!property) {
									root.properties[inner.property] = {
										type: 'literal',
										raw: null,
										hint: [prop.extends, i],
										key: inner.key,
										parent_key: inner.parent_key,
									}
								}
								break
							}
						}
					})
				}
			})
		})
		return json
	}

	type PropertyName = string & { __brand: 'PropertyName' }
	type Hint = string[]
	type Key = { key?: boolean | string }
	type Extend = { extend: null } | ({ extend: PropertyName } & Key)
	type _Ast = {
		class: {
			extends: string
			properties: Record<PropertyName, Property & { writable?: boolean } & Key>
		}
		pull: { path: PropertyName[] }
		put: { property: PropertyName }
		bidi: { property: PropertyName; parent_key?: boolean }
		literal: { raw: string | number | boolean } | { raw: null; hint?: Hint }
		const: { raw: string | number | boolean }
		i18n: { raw: string; id: string }
		dictionary: { properties: Array<Extend | [string, Property]>; hint?: Hint }
		list: { items: Array<Extend | Property>; hint?: Hint }
	}
	type Ast = { [K in keyof _Ast]: { type: K } & _Ast[K] }
	export type $mol_view_tree2_ast_types = Ast
	type Property = Ast[keyof Ast]
	export type $mol_view_tree2_ast_property = Property
	const types = Object.fromEntries(
		(
			['class', 'pull', 'put', 'bidi', 'literal', 'i18n', 'dictionary', 'list', 'const'] satisfies (keyof Ast)[]
		).map(t => [t, t]),
	) as { [k in keyof Ast]: k }

	export type $mol_view_tree2_ast = Record<string, Ast['class']>
}
