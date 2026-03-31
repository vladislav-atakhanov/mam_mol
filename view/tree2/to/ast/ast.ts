namespace $ {
	const err = $mol_view_tree2_error_str
	type Context = { chain: string[] }
	const isKey = (key: string) => (key ? (key.length === 1 ? true : key.slice(1)) : false)
	const Bool = (tree: $mol_tree2, value: boolean) => tree.struct(value ? 'true' : 'false')
	const Key = (tree: $mol_tree2, key: ReturnType<typeof isKey>) =>
		tree.struct('key', [typeof key === 'string' ? tree.data(key) : Bool(tree, key)])
	const tree = (t: $mol_tree2) => (t instanceof BaseAst ? [t.toTree()] : [])
	class BaseAst extends $mol_tree2 {
		TYPE = 'todo'
		constructor(public tree: $mol_tree2) {
			super(tree.type, tree.value, tree.kids, tree.span)
		}
		toTree(...children: $mol_tree2[]) {
			return object(this, [this.struct('type', [this.data(this.TYPE)]), ...children])
		}
	}

	const array = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('/', items)
	const object = (tree: $mol_tree2, items: readonly $mol_tree2[]) => tree.struct('*', items)

	type Str = $mol_tree2
	type PropertyName = Str
	type Hint = Str[]
	class Pull extends BaseAst {
		TYPE = 'pull'
		private path: PropertyName[]
		constructor(tree: $mol_tree2) {
			super(tree)
			this.path = []
			let kid = tree.kids[0]
			while (kid) {
				let { name } = $$.$mol_view_tree2_prop_parts(kid)
				this.path.push(kid.data(name))
				kid = kid.kids[0]
			}
		}
		toTree() {
			return super.toTree(this.struct('path', [array(this, this.path)]))
		}
	}
	class ExtendSelf extends BaseAst {
		TYPE = 'extend-self'
	}
	class Literal extends BaseAst {
		toTree(...children: $mol_tree2[]) {
			return super.toTree(this.struct('raw', [this]), ...children)
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
		private property: PropertyName
		private key: ReturnType<typeof isKey>
		constructor(tree: $mol_tree2) {
			super(tree)
			let { name, key } = $$.$mol_view_tree2_prop_parts(tree)
			this.property = tree.data(name)
			this.key = isKey(key)
		}
		toTree() {
			return super.toTree(this.struct('property', [this.property]), Key(this, this.key))
		}
	}
	class NullLiteral extends BaseAst {
		TYPE = 'null'
		private hint: Hint
		constructor(tree: $mol_tree2) {
			super(tree)
			const k = this.kids[0]
			this.hint = [k ? k.data(k.type) : this.data('')]
		}
		toTree() {
			return super.toTree(this.struct('hint', [array(this, this.hint)]))
		}
	}
	class Dictionary extends BaseAst {
		TYPE = 'dictionary'
		private properties: (ExtendSelf | Extend | [Str, Dictionary | List | Literals | Put])[]
		private hint: Hint
		constructor(tree: $mol_tree2, belt: $mol_tree2_belt<Context>, context: Context) {
			super(tree)
			this.hint = tree.type.length > 1 ? [this.data(tree.type.substring(1))] : []
			this.properties = tree.kids.map(k => {
				if (k.type === '^') {
					const prop = k.kids[0]
					if (!prop) return new ExtendSelf(k)
					return new Extend(prop)
				}
				const h = k.hack(belt, {
					...context,
					chain: [...(context.chain ?? []), k.type.replace(/\?\w*$/, '')],
				})
				return [k, h[0] as any]
			})
		}
		toTree() {
			return super.toTree(
				this.struct('hint', [array(this, this.hint)]),
				this.struct('properties', [
					array(
						this,
						this.properties.map(i => {
							if (Array.isArray(i)) {
								const [key, value] = i
								return array(key, [key.data(key.type), ...tree(value)])
							}
							return i.toTree()
						}),
					),
				]),
			)
		}
	}
	class List extends BaseAst {
		TYPE = 'list'
		private items: (ExtendSelf | Extend | Dictionary | List | Literals | Put)[]
		private hint: Hint
		constructor(tree: $mol_tree2, belt: $mol_tree2_belt<Context>, context: Context) {
			super(tree)
			this.hint = tree.type.length > 1 ? [this.data(tree.type.substring(1))] : []
			this.items = tree.kids.map(k => {
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
		}
		toTree() {
			return super.toTree(
				this.struct('hint', [array(this, this.hint)]),
				this.struct('items', [array(this, this.items.flatMap(tree))]),
			)
		}
	}

	class Arrow extends BaseAst {
		private property: PropertyName
		private key: ReturnType<typeof isKey>
		constructor(tree: $mol_tree2) {
			super(tree)
			const { name, key: key } = $$.$mol_view_tree2_prop_parts(tree.kids[0])
			this.property = tree.data(name)
			this.key = isKey(key)
		}
		toTree() {
			return super.toTree(Key(this, this.key), this.struct('property', [this.property]))
		}
	}
	class Ast extends BaseAst {
		private classes: Class[]
		constructor(tree: $mol_tree2) {
			super($$.$mol_view_tree2_classes(tree))
			this.classes = this.kids.map(klass => new Class(klass))
		}
		toTree() {
			return object(this, [this.struct('classes', [array(this, this.classes.flatMap(tree))])])
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
		private id: Str
		constructor(tree: $mol_tree2, klass: string, prop: string, { chain }: Context) {
			super(tree.kids[0])
			this.id = this.data(`${klass}_${prop}${chain.length ? `_${chain}` : ''}`)
		}
		toTree() {
			return super.toTree(this.struct('id', [this.id]))
		}
	}
	type Literals = NullLiteral | StringLiteral | StringTranslated | Const

	class InnerClass extends BaseAst {
		TYPE = 'class'
		private extends_: Str
		private properties: Map<
			PropertyName,
			{
				key?: $mol_tree2
				value: Put | Pull | Bidi | Dictionary | List | InnerClass | Literals
				writable?: $mol_tree2
			}
		>

		constructor(tree: $mol_tree2, belt: $mol_tree2_belt<Context>) {
			super(tree)
			this.extends_ = this
			this.properties = new Map(
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
							prop.data(name),
							{
								key: key ? prop : undefined,
								value: prop.hack(belt, { chain: [prop.type] })[0] as any,
								writable: next ? prop : undefined,
							},
						]
					}),
			)
		}

		toTree() {
			return super.toTree(
				this.struct('extends', [this.extends_.data(this.extends_.type)]),
				this.struct('properties', [
					object(
						this,
						Array.from(this.properties).map(([k, { key, value, writable }]) =>
							k.struct(k.value, [
								object(k, [
									Key(k, !!key),
									k.struct('writable', [Bool(k, !!writable)]),
									k.struct('value', tree(value)),
								]),
							]),
						),
					),
				]),
			)
		}
	}
	class Class extends BaseAst {
		TYPE = 'class'
		private extends_: Str
		private properties: Map<
			PropertyName,
			{
				key?: $mol_tree2
				value: Put | Put | Bidi | Dictionary | List | InnerClass | Literals
				writable?: $mol_tree2
			}
		>
		constructor(tree: $mol_tree2) {
			super(tree)
			this.extends_ = $$.$mol_view_tree2_child(tree)
			this.properties = new Map(
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
								if (input.type[0] === '*') return [new Dictionary(input, belt, context)]
								if (input.type[0] === '/') return [new List(input, belt, context)]
								if (input.value || (!input.value && !input.type)) return [new StringLiteral(input)]
								if (input.type && /^-?\d+(\.\d+)?$/.test(input.type)) return [new NumberLiteral(input)]
								if ($mol_view_tree2_class_match(input)) return [new InnerClass(input, belt)]
								return [new Const(input)]
							},
						},
						{ chain: [] } as Context,
					)
					return [
						prop.data(name),
						{
							key: key ? prop : undefined,
							value: val[0] as any,
							writable: next ? prop : undefined,
						},
					]
				}),
			)
		}
		get name() {
			return this.tree.type
		}
		toTree() {
			return super.toTree(
				this.struct('name', [this.data(this.name)]),
				this.struct('extends', [this.extends_.data(this.extends_.type)]),
				this.struct('properties', [
					object(
						this,
						Array.from(this.properties).map(([k, { key, value, writable }]) =>
							k.struct(k.value, [
								object(k, [
									Key(k, !!key),
									k.struct('writable', [Bool(k, !!writable)]),
									k.struct('value', tree(value)),
								]),
							]),
						),
					),
				]),
			)
		}
	}

	export function $mol_view_tree2_to_ast(this: $, tree: $mol_tree2) {
		return new Ast(tree)
	}

	export type $mol_view_tree2_ast = ReturnType<typeof $mol_view_tree2_to_ast>
}
