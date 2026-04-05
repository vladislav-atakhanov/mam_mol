namespace $ {
	const err = $mol_view_tree2_error_str
	type Context = { chain: string[] }
	class BaseAst extends $mol_tree2 {
		TYPE = 'todo'
		constructor(public tree: $mol_tree2) {
			super(tree.type, tree.value, tree.kids, tree.span)
		}
		json(...children: $mol_tree2[]) {
			return object(this, [this.struct('type', [this.data(this.TYPE)]), ...children])
		}
	}

	class Key extends BaseAst {
		key: string | boolean
		constructor(
			public tree: $mol_tree2,
			key: string,
		) {
			super(tree)
			this.key = key ? (key.length === 1 ? true : key.slice(1)) : false
		}
		json() {
			return typeof this.key === 'string' ? this.data(this.key) : this.struct(this.key ? 'true' : 'false')
		}
		bool() {
			return new Bool(this, this.key)
		}
	}
	class Bool extends BaseAst {
		val: boolean
		constructor(
			public tree: $mol_tree2,
			val: unknown,
		) {
			super(tree)
			this.val = !!val
		}
		json() {
			return this.struct(this.val ? 'true' : 'false')
		}
	}
	class Str extends BaseAst {
		constructor(
			public tree: $mol_tree2,
			public value: string,
		) {
			super(tree)
		}
		json() {
			return this.data(this.value)
		}
	}
	const json = (t: $mol_tree2) => (t instanceof BaseAst ? [t.json()] : [])
	const array = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('/', items)
	const object = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('*', items)
	class PropertyName extends Str {}
	type Hint = Str[]
	class Pull extends BaseAst {
		TYPE = 'pull'
		path: PropertyName[]
		constructor(tree: $mol_tree2) {
			super(tree)
			this.path = []
			let kid = tree.kids[0]
			while (kid) {
				let { name } = $$.$mol_view_tree2_prop_parts(kid)
				this.path.push(new PropertyName(kid, name))
				kid = kid.kids[0]
			}
		}
		json() {
			return super.json(this.struct('path', [array(this, this.path.flatMap(json))]))
		}
	}
	class ExtendSelf extends BaseAst {
		TYPE = 'extend-self'
	}
	class Literal extends BaseAst {
		json(...children: $mol_tree2[]) {
			return super.json(this.struct('raw', [this]), ...children)
		}
	}
	class NumberLiteral extends Literal {
		TYPE = 'number'
	}
	class StringLiteral extends Literal {
		TYPE = 'string'
	}
	class Const extends Literal {
		TYPE = 'const'
		constructor(tree: $mol_tree2) {
			super(tree.data(tree.type))
		}
	}
	class Extend extends BaseAst {
		TYPE = 'extend'
		property: PropertyName
		key: Key
		constructor(tree: $mol_tree2) {
			super(tree)
			let { name, key } = $$.$mol_view_tree2_prop_parts(tree)
			this.property = new PropertyName(tree, name)
			this.key = new Key(this, key)
		}
		json() {
			return super.json(this.struct('key', json(this.key)), this.struct('property', json(this.property)))
		}
	}
	class NullLiteral extends BaseAst {
		TYPE = 'null'
		hint: Hint
		constructor(tree: $mol_tree2, hint?: Hint) {
			super(tree)
			const k = this.kids[0]
			this.hint = hint ?? (k ? [new PropertyName(k, k.type)] : [])
		}
		json() {
			return super.json(this.struct('hint', [array(this, this.hint.flatMap(json))]))
		}
	}
	class Dictionary extends BaseAst {
		TYPE = 'dictionary'
		static from_tree2(tree: $mol_tree2, belt: $mol_tree2_belt<Context>, context: Context) {
			const hint = tree.type.length > 1 ? [new PropertyName(tree, tree.type.substring(1))] : []
			const properties = tree.kids.map(k => {
				if (k.type === '^') {
					const prop = k.kids[0]
					if (!prop) return new ExtendSelf(k)
					return new Extend(prop)
				}
				const h = k.hack(belt, {
					...context,
					chain: [...(context.chain ?? []), k.type.replace(/\?\w*$/, '')],
				})
				// Complex type because Array.isArray does not properly narrow tuple types
				return [new Str(k, k.type || k.value), h[0] as any] satisfies Extract<
					ConstructorParameters<typeof Dictionary>[1][number],
					readonly any[]
				>
			})
			return new Dictionary(tree, properties, hint)
		}
		constructor(
			tree: $mol_tree2,
			public properties: (ExtendSelf | Extend | [Str, Dictionary | List | Literals | Put])[],
			public hint: Hint,
		) {
			super(tree)
		}
		json() {
			return super.json(
				this.struct('hint', [array(this, this.hint.flatMap(json))]),
				this.struct('properties', [
					array(
						this,
						this.properties.map(i => {
							if (Array.isArray(i)) {
								const [key, value] = i
								return array(key, [key.json(), ...json(value)])
							}
							return i.json()
						}),
					),
				]),
			)
		}
	}
	class List extends BaseAst {
		TYPE = 'list'
		static from_tree2(tree: $mol_tree2, belt: $mol_tree2_belt<Context>, context: Context) {
			const hint = tree.type.length > 1 ? [new PropertyName(tree, tree.type.substring(1))] : []
			const items = tree.kids.map(k => {
				if (k.type === '^') {
					const prop = k.kids[0]
					if (!prop) return new ExtendSelf(k)
					return new Extend(prop)
				}
				const h = k.hack_self(belt, {
					...context,
					chain: [...(context.chain ?? []), k.type.replace(/\?\w*$/, '')],
				})
				return h[0] as any
			})
			return new List(tree, items, hint)
		}
		constructor(
			tree: $mol_tree2,
			public items: (ExtendSelf | Extend | Dictionary | List | Literals | Put)[],
			public hint: Hint,
		) {
			super(tree)
		}
		json() {
			return super.json(
				this.struct('hint', [array(this, this.hint.flatMap(json))]),
				this.struct('items', [array(this, this.items.flatMap(json))]),
			)
		}
	}

	class Arrow extends BaseAst {
		property: PropertyName
		key: Key
		constructor(tree: $mol_tree2) {
			super(tree)
			const kid = tree.kids[0]
			const { name, key } = $$.$mol_view_tree2_prop_parts(kid)
			this.property = new PropertyName(kid, name)
			this.key = new Key(this, key)
		}
		json() {
			return super.json(this.struct('key', json(this.key)), this.struct('property', json(this.property)))
		}
	}
	class Put extends Arrow {
		TYPE = 'put'
	}
	class Bidi extends Arrow {
		TYPE = 'bidi'
	}
	class StringTranslated extends Literal {
		TYPE = 'string-translated'
		id: Str
		constructor(tree: $mol_tree2, klass: string, prop: string, { chain }: Context) {
			super(tree.kids[0])
			this.id = new Str(this, `${klass}_${prop}${chain.length ? `_${chain}` : ''}`)
		}
		json() {
			return super.json(this.struct('id', [this.id]))
		}
	}
	type Literals = NullLiteral | StringLiteral | StringTranslated | Const

	class InnerClass extends BaseAst {
		TYPE = 'class'
		extends_: Str
		properties: Properties<Put | Pull | Bidi | Dictionary | List | InnerClass | Literals>

		constructor(tree: $mol_tree2, belt: $mol_tree2_belt<Context>) {
			super(tree)
			this.extends_ = new Str(this, tree.type)
			this.properties = new Properties(
				tree.kids
					.filter(over => {
						if (over.type[0] === '/') return false
						const bind = over.kids[0]
						if (bind.type === '=>') return false
						return true
					})
					.map(prop => {
						const { name, key, next } = $$.$mol_view_tree2_prop_parts(prop)
						return [
							new PropertyName(prop, name),
							{
								key: new Bool(prop, key),
								value: prop.hack(belt, { chain: [prop.type] })[0] as any,
								writable: new Bool(prop, next),
							},
						]
					}),
			)
		}

		json() {
			return super.json(
				this.struct('extends', [this.extends_.data(this.extends_.type)]),
				this.struct('properties', [
					object(
						this,
						this.properties.map(({ key, value, writable }, k) =>
							k.struct(k.value, [
								object(k, [
									k.struct('key', json(key)),
									k.struct('writable', json(writable)),
									k.struct('value', json(value)),
								]),
							]),
						),
					),
				]),
			)
		}
	}
	type Val<T extends BaseAst> = {
		key: Bool
		value: T
		writable: Bool
	}
	class Properties<V extends BaseAst> {
		innerMap: Map<string, [PropertyName, Val<V>]>
		constructor(v: [PropertyName, Val<V>][]) {
			this.innerMap = new Map(v.map(i => [i[0].value, i]))
		}
		get({ value }: PropertyName) {
			return this.innerMap.get(value)?.[1]
		}
		has({ value }: PropertyName) {
			return this.innerMap.has(value)
		}
		set(name: PropertyName, value: Val<V>) {
			return this.innerMap.set(name.value, [name, value])
		}
		forEach(cb: (v: Val<V>, k: PropertyName) => void) {
			Array.from(this.innerMap).forEach(([_, [k, v]]) => {
				cb(v, k)
			})
		}
		map<T>(cb: (v: Val<V>, k: PropertyName) => T) {
			return Array.from(this.innerMap).map(([_, [k, v]]) => cb(v, k))
		}
	}
	class Class extends BaseAst {
		TYPE = 'class'
		extends_: Str
		properties: Properties<Put | Put | Bidi | Dictionary | List | InnerClass | Literals>
		constructor(tree: $mol_tree2) {
			super(tree)
			const e = $$.$mol_view_tree2_child(tree)
			this.extends_ = new Str(e, e.type)
			this.properties = new Properties(
				$$.$mol_view_tree2_class_props(tree).map(prop => {
					const { name, key, next } = $$.$mol_view_tree2_prop_parts(prop)
					const val = prop.hack(
						{
							'=': v => [new Pull(v)],
							'=>': v => [new Pull(v)],
							'<=': v => [new Put(v)],
							'<=>': v => [new Bidi(v)],
							null: v => [new NullLiteral(v)],
							'@': (v, b, c) => [new StringTranslated(v, this.name, name, c)],
							'': (input, belt, context) => {
								if (input.type[0] === '*') return [Dictionary.from_tree2(input, belt, context)]
								if (input.type[0] === '/') return [List.from_tree2(input, belt, context)]
								if (input.value || (!input.value && !input.type)) return [new StringLiteral(input)]
								if (input.type && /^-?\d+(\.\d+)?$/.test(input.type)) return [new NumberLiteral(input)]
								if ($mol_view_tree2_class_match(input)) return [new InnerClass(input, belt)]
								return [new Const(input)]
							},
						},
						{ chain: [] } as Context,
					)
					return [
						new PropertyName(prop, name),
						{
							key: new Bool(prop, key),
							value: val[0] as any,
							writable: new Bool(prop, next),
						},
					]
				}),
			)
			this.prepare(this)
		}
		get name() {
			return this.tree.type
		}
		prepare(ast: BaseAst, ctx: { hint?: Hint; parent?: BaseAst } = {}) {
			if (ast instanceof Bidi) {
				const p = this.properties.get(ast.property)
				if (p) {
					p.key = ast.key.bool()
					p.writable = new Bool(ast, true)
				} else {
					this.properties.set(ast.property, {
						key: ast.key.bool(),
						writable: new Bool(ast, true),
						value: new NullLiteral(ast, ctx.hint ?? [ast.property]),
					})
				}
			} else if (ast instanceof List) {
				ast.items.forEach(i => this.prepare(i, { ...ctx, hint: ast.hint, parent: ast }))
			} else if (ast instanceof Extend) {
				if (!this.properties.has(ast.property)) {
					if (ctx.parent instanceof List) {
						this.properties.set(ast.property, {
							key: ast.key.bool(),
							value: new List(ast, [], ctx.hint ?? []),
							writable: new Bool(ast, false),
						})
					} else if (ctx.parent instanceof Dictionary) {
						this.properties.set(ast.property, {
							key: ast.key.bool(),
							value: new Dictionary(ast, [], ctx.hint ?? []),
							writable: new Bool(ast, false),
						})
					} else {
						this.properties.set(ast.property, {
							key: ast.key.bool(),
							value: new NullLiteral(ast, ctx.hint),
							writable: new Bool(ast, false),
						})
					}
				}
			} else if (ast instanceof Put) {
				if (!this.properties.has(ast.property)) {
					this.properties.set(ast.property, {
						key: ast.key.bool(),
						value: new NullLiteral(ast, ctx.hint),
						writable: new Bool(ast, false),
					})
				}
			} else if (ast instanceof Dictionary) {
				ast.properties.forEach(i => {
					if (Array.isArray(i)) {
						this.prepare(i[1], { ...ctx, hint: ast.hint, parent: ast })
					} else {
						this.prepare(i, { ...ctx, hint: ast.hint, parent: ast })
					}
				})
			} else if (ast instanceof Class || ast instanceof InnerClass) {
				ast.properties.forEach((prop, name) => {
					this.prepare(
						prop.value,
						ast instanceof InnerClass ? { hint: [(ast as InnerClass).extends_, name] } : {},
					)
					if (prop.value instanceof Bidi) prop.writable = new Bool(prop.value, true)
				})
			}
		}

		json() {
			return super.json(
				this.struct('name', [this.data(this.name)]),
				this.struct('extends', [this.extends_.data(this.extends_.type)]),
				this.struct('properties', [
					object(
						this,
						this.properties.map(({ key, value, writable }, k) =>
							k.struct(k.value, [
								object(k, [
									k.struct('key', json(key)),
									k.struct('writable', json(writable)),
									k.struct('value', json(value)),
								]),
							]),
						),
					),
				]),
			)
		}
	}

	export class $mol_view_tree2_to_ast extends BaseAst {
		classes: Class[]
		constructor(tree: $mol_tree2) {
			super($$.$mol_view_tree2_classes(tree))
			this.classes = this.kids.map(klass => new Class(klass))
		}
		json() {
			return object(this, [this.struct('classes', [array(this, this.classes.flatMap(json))])])
		}
		static Class = Class
		static Pull = Pull
		static Put = Put
		static InnerClass = InnerClass
		static Bidi = Bidi
		static StringTranslated = StringTranslated
		static Const = Const
		static String = StringLiteral
		static Number = NumberLiteral
		static Null = NullLiteral
	}
}
