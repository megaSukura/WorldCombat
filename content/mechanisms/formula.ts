/**
 * One formula tree defines one parameter. Compiling the tree produces a plain numeric closure used while
 * casting (no labels, no arrays, no scope); explaining the tree produces the same expression as tokens plus
 * one recursive entry per named term, so the hover text shows exactly the arithmetic that ran.
 *
 * A node with a label is a term: its parent shows the label and lists it, and its own expansion lives in
 * that term's `formula`/`terms`. Untagged intermediates inline, `const` inlines as a number, `when` shows
 * only the branch it took plus its truth, and `stage` shows the step value for the current level.
 */
namespace Formula {
    export type Text = string | { key: string; args?: any[]; fallback?: string };
    /** Variable provider. `expand` may open a labelled variable into how it was read (hover only). */
    export type Fact = number | boolean | undefined;
    /** A scope reads numbers/booleans; `text` exposes named string choices and `label` a move-local term name. */
    export interface Facts { read(id: string): Fact; expand?(id: string): Explanation | undefined; text?(id: string): string | undefined; label?(id: string): Text | undefined; }
    export type Token = Text | string;
    export interface Explanation { label?: Text; value: number; formula?: Token[]; terms: Explanation[]; note?: Text | Text[]; unavailable?: string[]; }
    /** A read is numeric or boolean; invalid numbers remain unavailable rather than becoming known zeroes. */
    export function fact(value: any): Fact { return typeof value === "boolean" || typeof value === "number" && isFinite(value) ? value : undefined; }
    /** Freeze only the facts read by one evaluation. Create another scope to observe later world changes. */
    export function snapshot(facts: Facts): Facts {
        var values: { [id: string]: Fact } = Object.create(null), expansions: { [id: string]: Explanation | undefined } = Object.create(null), texts: { [id: string]: string | undefined } = Object.create(null);
        return { read: function (id) {
            if (!Object.prototype.hasOwnProperty.call(values, id)) values[id] = fact(facts.read(id));
            return values[id];
        }, expand: function (id) {
            if (!Object.prototype.hasOwnProperty.call(expansions, id)) expansions[id] = facts.expand ? facts.expand(id) : undefined;
            return expansions[id];
        }, text: function (id) {
            if (!Object.prototype.hasOwnProperty.call(texts, id)) texts[id] = facts.text ? facts.text(id) : undefined;
            return texts[id];
        },
        label: function (id) { return facts.label ? facts.label(id) : undefined; } };
    }

    var INFIX: { [op: string]: number } = { "+": 1, "-": 1, "*": 2, "/": 2, ">": 0, ">=": 0, "<": 0, "<=": 0, "=": 0 };
    var SYMBOL: { [op: string]: string } = { "+": "+", "-": "−", "*": "×", "/": "÷", ">": ">", ">=": "≥", "<": "<", "<=": "≤", "=": "=" };

    /** Immutable expression node; every builder method returns a fresh node. */
    export class Node {
        constructor(public kind: string, public label: Text | undefined, public op: string, public value: number,
            public id: string, public args: Node[], public pairs: number[][], public fn: ((facts: Facts) => number) | undefined) { }
        plus(x: Node | number): Node { return operand("+", this, x); }
        minus(x: Node | number): Node { return operand("-", this, x); }
        times(x: Node | number): Node { return operand("*", this, x); }
        div(x: Node | number): Node { return operand("/", this, x); }
        max(x: Node | number): Node { return callNode("max", [this, asNode(x)]); }
        min(x: Node | number): Node { return callNode("min", [this, asNode(x)]); }
        clamp(lo: Node | number, hi: Node | number): Node { return callNode("clamp", [this, asNode(lo), asNode(hi)]); }
        pow(x: Node | number): Node { return callNode("pow", [this, asNode(x)]); }
        floor(): Node { return callNode("floor", [this]); }
        round(decimals?: number): Node { return new Node("op", undefined, "round", decimals || 0, "", [this], [], undefined); }
        gt(x: Node | number): Node { return operand(">", this, x); }
        gte(x: Node | number): Node { return operand(">=", this, x); }
        lt(x: Node | number): Node { return operand("<", this, x); }
        lte(x: Node | number): Node { return operand("<=", this, x); }
        eq(x: Node | number): Node { return operand("=", this, x); }
        /** Linear map of a 0..1 value onto lo..hi. */
        scale(lo: number, hi: number): Node { return this.times(hi - lo).plus(lo); }
        /** Name any subexpression so it becomes one term in its parent's explanation. */
        as(label: Text): Node { return new Node(this.kind, label, this.op, this.value, this.id, this.args, this.pairs, this.fn); }
    }

    function asNode(x: Node | number): Node { return typeof x === "number" ? constant(x) : x; }
    function callNode(op: string, args: Node[]): Node { return new Node("op", undefined, op, 0, "", args, [], undefined); }
    function operand(op: string, a: Node | number, b: Node | number): Node { return callNode(op, [asNode(a), asNode(b)]); }

    export function base(value: number, label?: Text): Node { return new Node("base", label, "", value, "", [], [], undefined); }
    export function constant(value: number): Node { return new Node("const", undefined, "", value, "", [], [], undefined); }
    export function variable(id: string, label?: Text): Node { return new Node("var", label, "", 0, id, [], [], undefined); }
    export function stat(name: string, label?: Text): Node { return variable("stat." + name, label || { key: "worldcombat.value.stat." + name, fallback: name }); }
    export function level(): Node { return variable("level", { key: "worldcombat.value.level" }); }
    export function body(name: string, label?: Text): Node { return variable("body." + name, label || { key: "worldcombat.value.body." + name, fallback: name }); }
    export function pref(path: string, label?: Text): Node { return variable("pref." + path, label || { key: "worldcombat.value.pref." + path }); }
    export function world(id: string, label?: Text): Node { return variable("world." + id, label || { key: "worldcombat.value.world." + id }); }
    /** Optional path reads a numeric/boolean leaf of the stored JSON object; an omitted path retains scalar readers. */
    export function state(id: string, label?: Text, path?: string): Node { return variable("state." + id + (path === undefined ? "" : "#" + path), label || { key: "worldcombat.value.state." + id, fallback: id }); }
    function namedFact(prefix: string, id: string, label?: Text): Node { return variable(prefix + "." + id, label || { key: "worldcombat.value." + prefix + "." + id, fallback: id }); }
    export function actor(id: string, label?: Text): Node { return namedFact("actor", id, label); }
    export function individual(id: string, label?: Text): Node { return namedFact("individual", id, label); }
    export function attribute(id: string, label?: Text): Node { return namedFact("attribute", id, label); }
    export function status(id: string, label?: Text): Node { return namedFact("status", id, label); }
    export function move(id: string, label?: Text): Node { return namedFact("move", id, label); }
    export function resource(id: string, label?: Text): Node { return namedFact("resource", id, label); }
    export function action(id: string, label?: Text): Node { return namedFact("action", id, label); }
    /** The path is relative to the target fact context, e.g. actor.healthRatio or status.<identity>. */
    export function target(path: string, label?: Text): Node { return namedFact("target", path, label); }
    /** 条件为节点；两个分支可取节点或数值常量（内部按 F.const 处理）。 */
    export function when(cond: Node, a: Node | number, b: Node | number): Node { return new Node("when", undefined, "", 0, "", [cond, asNode(a), asNode(b)], [], undefined); }
    /** 条件组合：非零为真，数值常量可直接参与。 */
    export function and(a: Node | number, b: Node | number): Node { return callNode("and", [asNode(a), asNode(b)]); }
    export function or(a: Node | number, b: Node | number): Node { return callNode("or", [asNode(a), asNode(b)]); }
    export function not(a: Node | number): Node { return callNode("not", [asNode(a)]); }
    /** 只在读到的都是已知事实时为真：未知目标取 0，避免把「需要目标」当成已知的 0。 */
    export function known(node: Node | number): Node { return callNode("known", [asNode(node)]); }
    /** 具名字符串配置的相等判断：偏好等于 expected 得 1，不等得 0，缺省得 0；标签默认取该招字段名。 */
    export function choice(path: string, expected: string | number | boolean, label?: Text): Node {
        return new Node("custom", label, "", 0, "pref." + path, [], [], function (facts) {
            var raw = typeof expected === "string" ? (facts.text ? facts.text("pref." + path) : undefined) : facts.read("pref." + path);
            return raw === expected ? 1 : 0;
        });
    }
    export function stage(pairs: number[][], label?: Text): Node { return new Node("stage", label, "", 0, "", [], pairs, undefined); }
    /** A level ladder of shifts (+0.25 from level 20, ...); the hover prints the ladder and the current level. */
    export function growth(pairs: number[][], label?: Text): Node { return new Node("stage", label, "signed", 0, "", [], pairs, undefined); }
    export function custom(fn: (facts: Facts) => number, label: Text): Node { return new Node("custom", label, "", 0, "", [], [], fn); }

    /** The chainable builder. `const` and `var` are reserved words, so they are reachable as properties. */
    export interface Builder {
        base(value: number, label?: Text): Node;
        const(value: number): Node;
        var(id: string, label?: Text): Node;
        stat(name: string, label?: Text): Node;
        level(): Node;
        body(name: string, label?: Text): Node;
        pref(path: string, label?: Text): Node;
        world(id: string, label?: Text): Node;
        state(id: string, label?: Text, path?: string): Node;
        actor(id: string, label?: Text): Node;
        individual(id: string, label?: Text): Node;
        attribute(id: string, label?: Text): Node;
        status(id: string, label?: Text): Node;
        move(id: string, label?: Text): Node;
        resource(id: string, label?: Text): Node;
        action(id: string, label?: Text): Node;
        target(path: string, label?: Text): Node;
        when(cond: Node, a: Node | number, b: Node | number): Node;
        and(a: Node | number, b: Node | number): Node;
        or(a: Node | number, b: Node | number): Node;
        not(a: Node | number): Node;
        known(node: Node | number): Node;
        choice(path: string, expected: string | number | boolean, label?: Text): Node;
        stage(pairs: number[][], label?: Text): Node;
        growth(pairs: number[][], label?: Text): Node;
        custom(fn: (facts: Facts) => number, label: Text): Node;
    }
    export var F: Builder = {
        base: base, const: constant, var: variable, stat: stat, level: level, body: body, pref: pref, world: world, state: state,
        actor: actor, individual: individual, attribute: attribute, status: status, move: move, resource: resource, action: action, target: target,
        when: when, and: and, or: or, not: not, known: known, choice: choice, stage: stage, growth: growth, custom: custom
    };

    export function labeled(node: Node): boolean { return isTerm(node); }
    function isTerm(node: Node): boolean {
        return node.label !== undefined || node.kind === "stage" || node.kind === "custom";
    }
    function normalize(value: number | boolean | undefined): number {
        return typeof value === "number" ? (isFinite(value) ? value : 0) : value === true ? 1 : 0;
    }
    function literal(value: number): string { return String(value).replace(/-/g, "−"); }
    function unknownText(): Text { return { key: "worldcombat.value.unknown" }; }
    function truthText(value: boolean): Text { return { key: value ? "worldcombat.value.true" : "worldcombat.value.false" }; }

    interface Body { tokens: Token[]; terms: Explanation[]; }

    function stageOf(pairs: number[][], facts: Facts): number {
        var level = normalize(facts.read("level"));
        if (!pairs.length) return 0;
        var chosen = pairs[0][1];
        for (var index = 0; index < pairs.length; index++) if (pairs[index][0] <= level) chosen = pairs[index][1];
        return chosen;
    }

    function valueOf(node: Node, facts: Facts): number {
        switch (node.kind) {
            case "const": case "base": return node.value;
            case "var": return normalize(facts.read(node.id));
            case "stage": return stageOf(node.pairs, facts);
            case "custom": return node.fn ? node.fn(facts) : 0;
            case "when": return valueOf(valueOf(node.args[0], facts) !== 0 ? node.args[1] : node.args[2], facts);
            default: {
                if (node.op === "known") return knownValue(node.args[0], facts);
                var values: number[] = [];
                for (var index = 0; index < node.args.length; index++) values.push(valueOf(node.args[index], facts));
                return applyOperator(node, values);
            }
        }
    }

    /** Re-evaluates under a probe that records any undefined read, so composite unknowns stay unknown. */
    function knownValue(node: Node, facts: Facts): number {
        var known = true;
        var probe: Facts = { read: function (id) { var value = facts.read(id); if (value === undefined) known = false; return value; },
            text: function (id) { var value = facts.text ? facts.text(id) : undefined; if (value === undefined) known = false; return value; }, label: facts.label };
        valueOf(node, probe);
        return known ? 1 : 0;
    }

    function applyOperator(node: Node, values: number[]): number {
        switch (node.op) {
            case "and": return values[0] !== 0 && values[1] !== 0 ? 1 : 0;
            case "or": return values[0] !== 0 || values[1] !== 0 ? 1 : 0;
            case "not": return values[0] === 0 ? 1 : 0;
            case "+": return values[0] + values[1];
            case "-": return values[0] - values[1];
            case "*": return values[0] * values[1];
            case "/": return values[0] / values[1];
            case ">": return values[0] > values[1] ? 1 : 0;
            case ">=": return values[0] >= values[1] ? 1 : 0;
            case "<": return values[0] < values[1] ? 1 : 0;
            case "<=": return values[0] <= values[1] ? 1 : 0;
            case "=": return values[0] === values[1] ? 1 : 0;
            case "max": return Math.max(values[0], values[1]);
            case "min": return Math.min(values[0], values[1]);
            case "pow": return Math.pow(values[0], values[1]);
            case "floor": return Math.floor(values[0]);
            case "clamp": return Math.max(values[1], Math.min(values[2], values[0]));
            case "round": {
                var factor = Math.pow(10, node.value);
                return factor <= 1 ? Math.round(values[0]) : Math.round(values[0] * factor) / factor;
            }
            default: return 0;
        }
    }

    /** Builds the numeric closure once; `when` evaluates only the branch it takes, and no operator allocates. */
    export function compile(node: Node): (facts: Facts) => number { return closure(node); }
    function closure(node: Node): (facts: Facts) => number {
        switch (node.kind) {
            case "const": case "base": { var value = node.value; return function (): number { return value; }; }
            case "var": { var id = node.id; return function (facts: Facts): number { return normalize(facts.read(id)); }; }
            case "custom": { var fn = node.fn; return fn ? fn : function (): number { return 0; }; }
            case "stage": { var pairs = node.pairs; return function (facts: Facts): number { return stageOf(pairs, facts); }; }
            case "when": {
                var condition = closure(node.args[0]), taken = closure(node.args[1]), other = closure(node.args[2]);
                return function (facts: Facts): number { return condition(facts) !== 0 ? taken(facts) : other(facts); };
            }
            default: return operator(node);
        }
    }
    function operator(node: Node): (facts: Facts) => number {
        var op = node.op;
        if (op === "clamp") {
            var clamped = closure(node.args[0]), low = closure(node.args[1]), high = closure(node.args[2]);
            return function (facts: Facts): number { return Math.max(low(facts), Math.min(high(facts), clamped(facts))); };
        }
        if (op === "round") {
            var rounded = closure(node.args[0]), factor = Math.pow(10, node.value);
            return function (facts: Facts): number { var value = rounded(facts); return factor <= 1 ? Math.round(value) : Math.round(value * factor) / factor; };
        }
        if (op === "known") {
            var probed = closure(node.args[0]);
            return function (facts: Facts): number {
                var known = true;
                var probe: Facts = { read: function (id) { var value = facts.read(id); if (value === undefined) known = false; return value; },
                    text: function (id) { var value = facts.text ? facts.text(id) : undefined; if (value === undefined) known = false; return value; }, label: facts.label };
                probed(probe);
                return known ? 1 : 0;
            };
        }
        var left = closure(node.args[0]);
        if (op === "floor") return function (facts: Facts): number { return Math.floor(left(facts)); };
        if (op === "not") return function (facts: Facts): number { return left(facts) === 0 ? 1 : 0; };
        var right = closure(node.args[1]);
        switch (op) {
            case "and": return function (facts: Facts): number { return left(facts) !== 0 && right(facts) !== 0 ? 1 : 0; };
            case "or": return function (facts: Facts): number { return left(facts) !== 0 || right(facts) !== 0 ? 1 : 0; };
            case "+": return function (facts: Facts): number { return left(facts) + right(facts); };
            case "-": return function (facts: Facts): number { return left(facts) - right(facts); };
            case "*": return function (facts: Facts): number { return left(facts) * right(facts); };
            case "/": return function (facts: Facts): number { return left(facts) / right(facts); };
            case ">": return function (facts: Facts): number { return left(facts) > right(facts) ? 1 : 0; };
            case ">=": return function (facts: Facts): number { return left(facts) >= right(facts) ? 1 : 0; };
            case "<": return function (facts: Facts): number { return left(facts) < right(facts) ? 1 : 0; };
            case "<=": return function (facts: Facts): number { return left(facts) <= right(facts) ? 1 : 0; };
            case "=": return function (facts: Facts): number { return left(facts) === right(facts) ? 1 : 0; };
            case "max": return function (facts: Facts): number { return Math.max(left(facts), right(facts)); };
            case "min": return function (facts: Facts): number { return Math.min(left(facts), right(facts)); };
            case "pow": return function (facts: Facts): number { return Math.pow(left(facts), right(facts)); };
            default: return function (): number { return 0; };
        }
    }

    /** One explanation lists each term where it first appears; later mentions reference it by label only. */
    export function explain(node: Node, facts: Facts): Explanation {
        var scoped = snapshot(facts), missing: string[] = [];
        var result = item(node, { read: function (id) {
            var value = scoped.read(id);
            if (value === undefined && missing.indexOf(id) < 0) missing.push(id);
            return value;
        }, expand: scoped.expand, text: scoped.text, label: scoped.label }, []);
        function collect(item: Explanation): void {
            (item.unavailable || []).forEach(id => { if (missing.indexOf(id) < 0) missing.push(id); });
            item.terms.forEach(collect);
        }
        collect(result);
        if (missing.length) { result.unavailable = missing; result.note = (result.note ? Array.isArray(result.note) ? result.note : [result.note] : []).concat([unknownText()]); }
        return result;
    }

    function labelOf(node: Node, facts: Facts): Text {
        // Preference reads adopt the move's own field name so the player never sees an internal path.
        if (node.id && node.id.indexOf("pref.") === 0 && facts.label) {
            var resolved = facts.label(node.id);
            if (resolved) return resolved;
        }
        if (node.label !== undefined) return node.label;
        if (node.kind === "stage") return { key: "worldcombat.value.stage" };
        if (node.kind === "base") return literal(node.value);
        return unknownText();
    }
    /** "20 级 +0.25 · 40 级 +0.5（当前 30 级）": the steps that change the value, then where the level stands. */
    function ladder(node: Node, facts: Facts): Token[] {
        var tokens: Token[] = [], signed = node.op === "signed";
        for (var index = 0; index < node.pairs.length; index++) {
            var level = node.pairs[index][0], value = node.pairs[index][1];
            if (level < 1 || signed && value === 0) continue;
            if (tokens.length) tokens.push(" · ");
            tokens.push({ key: "worldcombat.value.stageStep", args: [level, (signed && value > 0 ? "+" : "") + literal(value)] });
        }
        tokens.push({ key: "worldcombat.value.stageNow", args: [normalize(facts.read("level"))] });
        return tokens;
    }

    function item(node: Node, facts: Facts, seen: Node[]): Explanation {
        var value = valueOf(node, facts);
        if (isTerm(node)) {
            var result: Explanation = { label: labelOf(node, facts), value: value, terms: [] };
            if (node.kind === "var") {
                if (facts.read(node.id) === undefined) result.formula = [unknownText()];
                else if (facts.expand) {
                    var opened = facts.expand(node.id);
                    if (opened) {
                        if (opened.formula) result.formula = opened.formula;
                        result.terms = opened.terms;
                        if (opened.note) result.note = opened.note;
                        if (opened.unavailable) result.unavailable = opened.unavailable;
                    }
                }
                return result;
            }
            if (node.kind === "stage") { result.note = { key: "worldcombat.value.ladder", args: [ladder(node, facts)] }; return result; }
            if (node.kind === "base" || node.kind === "custom") return result;
            var body = renderBody(node, facts, -1, false, seen);
            result.formula = body.tokens; result.terms = body.terms;
            return result;
        }
        var inline = renderBody(node, facts, -1, false, seen);
        return { value: value, formula: inline.tokens, terms: inline.terms };
    }

    function render(node: Node, facts: Facts, parent: number, right: boolean, seen: Node[]): Body {
        if (isTerm(node)) {
            if (seen.indexOf(node) >= 0) return { tokens: [labelOf(node, facts)], terms: [] };
            seen.push(node);
            return { tokens: [labelOf(node, facts)], terms: [item(node, facts, seen)] };
        }
        return renderBody(node, facts, parent, right, seen);
    }

    function renderBody(node: Node, facts: Facts, parent: number, right: boolean, seen: Node[]): Body {
        switch (node.kind) {
            case "const": case "base": return { tokens: [literal(node.value)], terms: [] };
            case "var": {
                var raw = facts.read(node.id);
                return { tokens: [raw === undefined ? unknownText() : literal(normalize(raw))], terms: [] };
            }
            case "stage": case "custom": return { tokens: [], terms: [] };
            case "when": {
                var condition = node.args[0], truth = valueOf(condition, facts) !== 0;
                var body = render(truth ? node.args[1] : node.args[2], facts, parent, right, seen);
                // The condition line names the switch that was read (a labelled variable) and how it stood.
                var conditionLabel: Text = isTerm(condition) ? labelOf(condition, facts) : { key: "worldcombat.value.condition" };
                var conditionItem = item(condition, facts, []);
                var conditionTokens: Token[] = conditionItem.formula || [literal(conditionItem.value)];
                // An unread condition (no target, no world) reports "resolved on impact" instead of a known branch.
                var conditionNote = condition.kind === "var" && facts.read(condition.id) === undefined ? { key: "worldcombat.value.atImpact" } : conditionItem.note;
                body.terms = body.terms.concat([{ label: conditionLabel, value: truth ? 1 : 0,
                    formula: conditionTokens.concat(["=", truthText(truth)]), terms: conditionItem.terms, note: conditionNote }]);
                return body;
            }
            default: return opBody(node, facts, parent, right, seen);
        }
    }

    function opBody(node: Node, facts: Facts, parent: number, right: boolean, seen: Node[]): Body {
        if (INFIX[node.op] === undefined) {
            var callTokens: Token[] = [node.op + "("], callTerms: Explanation[] = [];
            for (var index = 0; index < node.args.length; index++) {
                if (index) callTokens.push(",");
                var argument = render(node.args[index], facts, -1, false, seen);
                callTokens = callTokens.concat(argument.tokens); callTerms = callTerms.concat(argument.terms);
            }
            if (node.op === "round" && node.value > 0) { callTokens.push(","); callTokens.push(String(node.value)); }
            callTokens.push(")");
            return { tokens: callTokens, terms: callTerms };
        }
        var precedence = INFIX[node.op];
        var left = render(node.args[0], facts, precedence, false, seen);
        var rightBody = render(node.args[1], facts, precedence, true, seen);
        var tokens = left.tokens.concat([SYMBOL[node.op]], rightBody.tokens);
        if (precedence < parent || precedence === parent && right) tokens = parenthesize(tokens);
        return { tokens: tokens, terms: left.terms.concat(rightBody.terms) };
    }
    function parenthesize(tokens: Token[]): Token[] {
        var wrapped: Token[] = ["("];
        for (var index = 0; index < tokens.length; index++) wrapped.push(tokens[index]);
        wrapped.push(")");
        return wrapped;
    }
}
