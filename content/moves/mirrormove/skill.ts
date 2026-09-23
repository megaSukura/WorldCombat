/**
 * 鹦鹉学舌 / mirrormove —— 注册、折返增幅与动作（自管节奏）。
 *
 * 借对手那一手回打必须在提交之前交接（NativeLoadout.call），所以本招自己驱动动作：
 *   起：身前立起一面镜盾（action.present 预告），朝向对手。
 *   折：读对手最近一次真正提交的、带 mirror 旗标的招式；把那一手原样折回它自己身上。
 *       配置 keen 开启时，把折返增幅写进 action.data，提交后由 committed 监听挂到施法者身上，
 *       伤害元数据在结算前乘上 edge——借招的伤害发生在提交之后，所以这一步来得及。
 *   反制：对手没出过手、那一手不带 mirror、超出记忆窗口或未实装时，只退回不结账。
 *
 * 与仿效分开：仿效捡的是“全场最后响起的一手”，对谁都能捡；鹦鹉学舌只还击眼前的对手、只还击它自己的上一手。
 * 与抢先一步分开：抢先一步抢在对手想出手的下一拍、且只抢伤害招并加重；鹦鹉学舌折的是已经落下的那一手。
 */
namespace PokemonSkills {
    // 折返增幅的机读载体：记下要被加重的那一手与倍率；伤害元数据按它乘威力。
    WorldCombat.effect(mirrorGlossEffect, 1, 200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.move !== "string" || !value.move) throw new Error("Invalid mirror gloss move");
        if (typeof value.factor !== "number" || !isFinite(value.factor) || value.factor < 1) throw new Error("Invalid mirror gloss factor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mirrorGlossEffect, "start", function () { });
    WorldCombat.effectHandler(mirrorGlossEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    PokemonDamage.metadata.define({ id: "world_combat:move_mirrormove/gloss", apply: function (context) {
        if (!context.world || !context.actor) return;
        const views = context.world.effects(context.actor, mirrorGlossEffect);
        if (!views.length) return;
        const data = JSON.parse(String(views[0].data()));
        if (String(data.move) !== String(context.metadata.move)) return;
        const factor = Number(data.factor);
        if (isFinite(factor) && factor > 0) context.metadata.power *= factor;
    } });

    /** 目标最近一次可折返的招式 id；空串表示无。 */
    export function mirrorRead(world: CombatWorld, target: CombatActor | null): string {
        if (target === null || !world.valid(target) || String(target.domain()) !== "cobblemon") return "";
        const last = NativeEffects.lastMove(world, target);
        if (last === null) return "";
        if (world.tick() - last.tick > p(mirrormoveId, "focus", world)) return "";
        const id = String(last.id);
        if (!skills[id]) return "";
        if (!NativeLoadout.facts(CobblemonCombat.moveTemplate(id)).flags.mirror) return "";
        return id;
    }

    /** 把折返的那一手瞄准目标本人；自用招仍作用于自己。 */
    export function mirrorCall(action: CombatAction, id: string, target: CombatActor | null): NativeLoadout.CallOptions | null {
        const skill = skills[id];
        if (!skill) return null;
        if (skill.kind === "self") return { eligibility: "caller", input: {} };
        const world = action.sense();
        if (skill.kind === "friend") {
            const self = action.actor(), body = world.observe(self);
            return body ? { eligibility: "caller", input: { target: self, point: body.position() } } : null;
        }
        if (target === null || !world.valid(target)) return null;
        const body = world.observe(target);
        if (body === null) return null;
        const point = body.position();
        let direction = point.minus(action.origin());
        if (direction.length() < 0.01) direction = action.direction();
        return { eligibility: "caller", input: { target: skill.kind === "enemy" ? target : null, point: point, direction: direction } };
    }

    define({
        id: mirrormoveId,
        cooldownParameter: "recharge",
        name: "鹦鹉学舌",
        description: "在身前立起一面镜盾，把对手刚刚使出的那一手原样折回它自己身上；对手还没出过可折的招时落空。",
        uses: ["把对手的上一手还给它", "拆刚打完一轮强攻的敌人", "在受击前一拍抢回节奏"],
        kind: "enemy",
        range: 12,
        maxRange: 18,
        prepare: 6,
        active: 0,
        recover: 4,
        cooldown: 55,
        style: "mirror",
        defaults: { keen: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [],
        interruptible: false,
        indicator: function (config, pokemon) {
            return { radius: p(mirrormoveId, "reach", pokemon), geometry: "line", style: "mirror", color: 0x7FD0E8,
                label: read(config, ["keen"]) === true ? "鹦鹉学舌·锐镜" : "鹦鹉学舌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[mirrormoveId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: p(mirrormoveId, "tempo", context),
                recover: p(mirrormoveId, "aftercast", context),
                cooldown: p(mirrormoveId, "recharge", context),
                active: 0,
                range: p(mirrormoveId, "reach", context)
            };
        },
        run: function (action, _move, config) {
            const target = action.target();
            const mirrors = Math.max(1, Math.round(p(mirrormoveId, "mirrors", action)));
            const keen = read(config, ["keen"]) === true;
            action.present("world_combat:move_mirrormove:brace", mirrorScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", target: target === null ? "" : String(target.ref()), mirrors: mirrors, keen: keen ? 1 : 0 }));
            action.after(Math.max(1, Math.round(p(mirrormoveId, "tempo", action))), function (current) {
                const world = current.sense();
                const found = mirrorRead(world, target);
                const options = found ? mirrorCall(current, found, target) : null;
                if (found === "" || options === null) {
                    current.present("world_combat:move_mirrormove:dull", mirrorScene, 1, current.origin(),
                        JSON.stringify({ moment: "dull", mirrors: mirrors }));
                    current.reject("no-mirror");
                    return;
                }
                const edge = p(mirrormoveId, "edge", current);
                current.data("world_combat:mirrormove/gloss", JSON.stringify({ move: found, factor: edge }));
                const targetRef = target === null ? "" : String(target!.ref());
                current.present("world_combat:move_mirrormove:reflect", mirrorScene, 1, current.origin(),
                    JSON.stringify({ moment: "reflect", mirrors: mirrors, edge: edge, target: targetRef,
                        path: [String(current.actor().ref()), targetRef === "" ? String(current.actor().ref()) : targetRef] }));
                NativeLoadout.call(current, found, { input: options.input, eligibility: "caller", cooldown: p(mirrormoveId, "recharge", current) });
            });
        }
    });

    // 借来的招式提交的那一刻：补上锐镜增幅、折返的浮字、落点爆开与音效。
    WorldCombat.on("world_combat:move_mirrormove/committed", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null || String(action.content()) !== "world_combat:mirrormove") return;
        const world = event.world(), actor = event.actor(), executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const id = String(executing.id());
        const raw = action.data("world_combat:mirrormove/gloss");
        if (raw !== null) {
            const gloss = JSON.parse(raw);
            if (gloss.move === id && Number(gloss.factor) > 1) world.effect(mirrorGlossEffect, actor, JSON.stringify(gloss), 80);
        }
        WorldFeedback.emit(world, mirrorScene, 1, body.position(),
            { moment: "burst", mirrors: Math.max(1, Math.round(p(mirrormoveId, "mirrors", action))), edge: p(mirrormoveId, "edge", action),
                target: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), mirrorReflectText,
            [{ key: "cobblemon.move." + id, fallback: id }], 34);
        world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 16, "{}");
    });
}
