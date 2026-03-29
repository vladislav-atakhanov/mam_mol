namespace $ {
	const err = $mol_view_tree2_error_str

	const Type = (tree: $mol_tree2, type: Property['type']) => [tree.struct('type', [tree.data(type)])]
	const Literal = (tree: $mol_tree2) => [...Type(tree, types.literal), tree.struct(`raw`, [tree])]
	const Null = (tree: $mol_tree2) => [
		...Type(tree, types.literal),
		tree.struct(`raw`, [tree]),
		...(tree.kids.length > 0
			? [
					tree.struct(
						`hint`,
						tree.kids.map(k => k.data(k.type)),
					),
				]
			: []),
	]
	const Class = (tree: $mol_tree2, parent: $mol_tree2, props: $mol_tree2[]) => [
		...Type(tree, types.class),
		tree.struct('extends', [parent.data(parent.type)]),
		tree.struct('properties', [object(parent, props)]),
	]
	function Property(this: $, prop: $mol_tree2, ...other: $mol_tree2[]) {
		const { name, key, next } = this.$mol_view_tree2_prop_parts(prop)
		return prop.struct(name, [
			object(prop, [
				...other,
				...(key
					? [prop.struct('key', [key.length === 1 ? prop.struct('true', []) : prop.data(key.slice(1))])]
					: []),
				...(next ? [prop.struct('writable', [prop.struct(next ? 'true' : 'false', [])])] : []),
			]),
		])
	}

	function name_of(this: $, prop: $mol_tree2) {
		return this.$mol_view_tree2_prop_parts(prop).name
	}

	const array = (root: $mol_tree2, items: readonly $mol_tree2[]) => root.struct('/', items)
	const object = (root: $mol_tree2, items: readonly $mol_tree2[]) => root.struct('*', items)

	function Arrow(this: $, v: $mol_tree2, type: (typeof types)['bidi'] | (typeof types)['put']) {
		return [...Type(v, type), v.struct('property', [v.data(name_of.call(this, v.kids[0]))])]
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
							const name = name_of.call(this, prop)
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
												...(input.type.length > 0
													? [input.struct('hint', [input.data(input.type.substring(1))])]
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
												...(input.type.length > 0
													? [input.struct('hint', [input.data(input.type.substring(1))])]
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
														...over.hack(belt, { chain: [over.type] }),
													),
												)

											return Class(input, input, overrides)
										}

										return Literal(input)
									},
								},
								{ chain: [] as string[] },
							)

							return Property.call(this, prop, ...val)
						}),
					),
				),
			])
		})

		return object(descr, classes)
	}

	type PropertyName = string & { __brand: 'PropertyName' }
	type _Ast = {
		class: {
			extends: string
			properties: Record<PropertyName, Property & { key: boolean; writable: boolean }>
		}
		pull: { path: PropertyName[] }
		put: { property: PropertyName }
		bidi: { property: PropertyName }
		literal: { raw: string | number | boolean } | { raw: null; hint?: string }
		i18n: { raw: string; id: string }
		dictionary: { properties: Array<{ self: true } | PropertyName | [string, Property]> }
		list: { properties: Array<{ self: true } | PropertyName | Property> }
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
