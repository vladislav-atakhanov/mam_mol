namespace $ {
	const err = $mol_view_tree2_error_str

	const Type = (tree: $mol_tree2, type: Property['type']) => [tree.struct('type', [tree.data(type)])]
	const Literal = (tree: $mol_tree2) => [...Type(tree, types.literal), tree.struct(`raw`, [tree])]
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
	function Property(this: $, tree: $mol_tree2, other: $mol_tree2[] = [], keyName = 'key') {
		const { name, key, next } = this.$mol_view_tree2_prop_parts(tree)
		return tree.struct(name, [
			object(tree, [
				...other,
				...(key
					? [tree.struct(keyName, [key.length === 1 ? tree.struct('true') : tree.data(key.slice(1))])]
					: []),
				...(next ? [tree.struct('writable', [tree.struct('true')])] : []),
			]),
		])
	}

	function parts(this: $, prop: $mol_tree2) {
		return this.$mol_view_tree2_prop_parts(prop)
	}

	const array = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('/', items)
	const object = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('*', items)

	function Arrow(this: $, tree: $mol_tree2, type: (typeof types)['bidi'] | (typeof types)['put']) {
		const { name, key } = parts.call(this, tree.kids[0])

		return [
			...Type(tree, type),
			tree.struct('property', [tree.data(name)]),
			...(key
				? [tree.struct('key', [key.length === 1 ? tree.struct('true', []) : tree.data(key.slice(1))])]
				: []),
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
							const keywords = Object.fromEntries(
								['false', 'true', 'Infinity', '-Infinity', 'NaN'].map(k => [k, k]),
							)
							const extend = (tree: $mol_tree2) => {
								if (tree.type === '^') {
									const prop = tree.kids[0]
									return prop
										? tree.data(prop.type)
										: object(tree, [tree.struct('self', [tree.struct('true')])])
								}
							}
							const val = prop.hack(
								{
									...Object.fromEntries(
										Object.entries(keywords).map(([k, l]) => [k, t => Literal(t)]),
									),
									null: Null,
									'=': v => {
										const path = []
										let kid = v.kids[0]
										while (kid) {
											path.push(kid.data(kid.type))
											kid = kid.kids[0]
										}
										return [...Type(v, 'pull'), v.struct('path', [array(v, path)])]
									},
									'<=': v => Arrow.call(this, v, 'put'),
									'<=>': v => Arrow.call(this, v, 'bidi'),
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
										if (input.type && $mol_tree2_js_is_number(input.type)) return Literal(input)

										if ($mol_view_tree2_class_match(input)) {
											const overrides = input.kids
												.filter(over => {
													if (over.type[0] === '/') return false
													const bind = over.kids[0]
													if (bind.type === '=>') return false
													return true
												})
												.map(over =>
													Property.call(
														this,
														over,
														over.hack(belt, { chain: [over.type] }),
														'parent_key',
													),
												)

											return Class(input, input, overrides)
										}

										return Literal(input)
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

		const ast = this.$mol_tree2_to_json(object(descr, classes)) as $mol_view_tree2_ast

		Object.entries(ast).forEach(([className, root]) => {
			Object.entries(root.properties).forEach(([name, klass]) => {
				if (klass.type !== types.class) return
				Object.entries(klass.properties).forEach(([n, prop]) => {
					switch (prop.type) {
						case types.bidi: {
							const property = root.properties[prop.property]
							if (property) {
								property.writable = true
								property.key = prop.key
							} else
								root.properties[prop.property] = {
									type: 'literal',
									raw: null,
									hint: [klass.extends, n],
									writable: true,
									key: prop.key,
								}
							break
						}
						case types.put: {
							console.log(`${name}.${n} <= ${prop.property}`)
							const property = root.properties[prop.property]
							if (!property) {
								root.properties[prop.property] = {
									type: 'literal',
									raw: null,
									hint: [klass.extends, n],
									key: prop.key,
								}
							}
							break
						}
					}
				})
			})
		})

		return ast
	}

	type PropertyName = string & { __brand: 'PropertyName' }
	type Hint = string[]
	type _Ast = {
		class: {
			extends: string
			properties: Record<PropertyName, Property & { key?: boolean; writable?: boolean; parent_key?: boolean }>
		}
		pull: { path: PropertyName[] }
		put: { property: PropertyName }
		bidi: { property: PropertyName }
		literal: { raw: string | number | boolean } | { raw: null; hint?: Hint }
		i18n: { raw: string; id: string }
		dictionary: { properties: Array<{ self: true } | PropertyName | [string, Property]>; hint?: Hint }
		list: { properties: Array<{ self: true } | PropertyName | Property>; hint?: Hint }
	}
	type Ast = { [K in keyof _Ast]: { type: K } & _Ast[K] }
	export type $mol_view_tree2_ast_types = Ast
	type Property = Ast[keyof Ast]
	const types = Object.fromEntries(
		(['class', 'pull', 'put', 'bidi', 'literal', 'i18n', 'dictionary', 'list'] satisfies (keyof Ast)[]).map(t => [
			t,
			t,
		]),
	) as { [k in keyof Ast]: k }

	export type $mol_view_tree2_ast = Record<string, Ast['class']>
}
