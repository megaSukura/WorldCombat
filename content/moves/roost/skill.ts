/**
 * 羽栖 / Roost —— 执行组织。
 *
 * 核心念头：收拢双翼落回地面，贴着地把回复一口一口歇回来；歇着的时候它飞不起来，也就是最容易被抓住的一段。
 *
 * 出手：共享节奏。windup（提交前）只播预告——脚边气流先向下压，告诉对手「它要落地了」；准备可被打断，不花代价。
 * 下落（descend，提交后）：若还悬在空中，先选脚下这一点、用受碰撞限制的小段原生位移向下落；只有真的踩到实地才继续。
 * 落地（land）：扬尘与羽尘一圈铺开，给自己挂共享身份 world_combat:status/roosting（本单元效果
 *   world_combat:roosting），并用共享临时类型层去掉飞行属性（纯飞行得到空类型，对宝可梦生效）；两者都绑在这一个载体上，
 *   载体被清除或取消时一起收回。
 * 栖息（perch）：把 heal 分成 chunks 段，每段间隔交付；每段前确认身份还在——身份被牛奶／`/effect clear` 提前清掉，
 *   或施法者离场，就按已交付的比例收尾（broken）。栖息画面由载体拥有的托管效果承载，随载体一起收。
 * 起身（rise）：整段交付完，收势起身。
 *
 * 反制：栖息窗口就是余地——对手可以趁着它失去飞行、贴在地面时集火，或直接清掉身份打断剩下的回复。
 * 与同族分开：月光／光合作用是读环境的一口结算；睡觉是不能行动、被打醒打折的整段恢复；羽栖是**落地分段、可被清除效果打断**的一口。
 */
namespace PokemonSkills {
    const roostScene = "world_combat:move_roost";
    const roostMark = "world_combat:roosting";
    const roostPerch = "world_combat:roost_perch";
    const roostTextLand = "world_combat.move.roost.text.land";
    const roostTextRise = "world_combat.move.roost.text.rise";
    const roostTextBroken = "world_combat.move.roost.text.broken";
    /** 每刻下落格数与最长下落刻数：受碰撞限制的小段位移，不瞬移穿地。 */
    const roostFallStep = 0.5;
    const roostFallBudget = 60;

    function roostAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function roostHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        var body = world.observe(target);
        if (!body) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0) return 0;
        var amount = Math.min(missing, body.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    // 栖息画面：绑在真实载体上，载体被清除、取消或重施时随之一并收走，不留残影。
    WorldCombat.effect(roostPerch, 1, 12000, "actor", function (json) {
        const value = JSON.parse(json);
        if (!MobEffects.validAnchor(value.anchor)) throw new Error("Invalid roost perch");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(roostPerch, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.anchor)) { effect.end(); return; }
        const body = world.observe(actor); if (body === null) return;
        WorldFeedback.onEffect(world, effect.id(), "roost:perch:" + String(actor.ref()), roostScene, 1, body.position(),
            { moment: "perch", actor: String(actor.ref()), scale: state.scale, restRate: state.restRate });
    });
    WorldCombat.effectHandler(roostPerch, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 载体被清除：栖落画面立即收；若是被重施替换则交给新载体。
    WorldCombat.on("world_combat:move_roost/perch-fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== roostMark) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, roostMark) !== null) return;
        world.effects(actor, roostPerch).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        freeMovement: true,
        id: roostId, name: "羽栖",
        description: "收拢双翼落回地面，贴地栖息一段：回复分成几段交付，总量约最大生命的一半；栖息期间失去飞行属性、暴露在地面招式与青草场地之下，栖落状态被清除会打断剩下的回复。",
        uses: ["在受击间隙里分段补回生命", "用落地窗口换一口更稳的回复", "让飞禽暂时贴地、吃地形影响"],
        kind: "self", range: 0, prepare: 12, active: 0, recover: 10, cooldown: 220, style: "roost", maximumTicks: 260,
        stationary: true,
        defaults: { deep: false },
        fields: [flag("deep", "深栖")],
        indicator: function (config) { return { radius: config && config.deep === true ? 2 : 1, style: "roost", label: config && config.deep === true ? "深栖" : "浅栖" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[roostId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var deep = config && config.deep === true;
            return {
                prepare: Math.max(4, Math.round(p(roostId, "gather", context))),
                recover: Math.max(4, Math.round(p(roostId, "settle", context))),
                cooldown: Math.round(p(roostId, "cooldown", context) * (deep ? 1.1 : 0.96)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("roost:windup", roostScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", downdraft: p(roostId, "downdraft", action), target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (!body) { done(action); return; }
            const deep = config && config.deep === true;
            const total = Math.max(0.05, Math.min(0.9, p(roostId, "heal", action)));
            const rest = Math.max(20, Math.round(p(roostId, "restTicks", action)));
            const chunks = Math.max(2, Math.round(p(roostId, "chunks", action)));
            const feathers = Math.max(8, Math.round(p(roostId, "feathers", action)));
            const width = Math.max(0.6, p(roostId, "foldWidth", action));
            const downdraft = Math.max(4, Math.round(p(roostId, "downdraft", action)));
            const interval = Math.max(4, Math.round(rest / chunks));
            const scale = Math.max(0.7, Math.min(1.8, width));
            const restRate = Math.max(6, Math.min(28, Math.round(feathers / 2)));
            const fallScale = Math.max(0.6, Math.min(1.6, feathers / 24));

            /** 真实落地后才付治疗、去飞行；没落到实地就只收势，不假造回复。 */
            function perch(current: CombatAction): void {
                const access = current.world(), now = access.observe(self);
                if (!now) { done(current); return; }
                const carrier = MobEffects.apply(access, self, roostMark, rest, 0);
                if (carrier === null) { done(current); return; }
                // 载体归这次动作所有：取消、离场或脚本失败时随动作一起撤；净化走原生移除。
                MobEffects.bind(access, self, roostMark, carrier);
                CombatTypes.apply(access, self, { operation: "remove", types: ["flying"] }, carrier);
                access.effect(roostPerch, self,
                    JSON.stringify({ anchor: MobEffects.anchor(carrier), scale: scale, restRate: restRate }), rest);
                sound(current, "minecraft:entity.parrot.fly");
                WorldFeedback.emit(access, roostScene, 1, now.position(),
                    { moment: "land", target: String(self.ref()), burst: feathers, radius: width, scale: scale }, 30);
                WorldFeedback.text(access, roostAbove(now.position()), roostTextLand, [], 30);

                var left = chunks;
                function step(inner: CombatAction): void {
                    const scope = inner.world();
                    if (!scope.valid(self)) { done(inner); return; }
                    const body = scope.observe(self);
                    if (!body) { done(inner); return; }
                    if (MobEffects.read(scope, self, roostMark) === null) {
                        WorldFeedback.emit(scope, roostScene, 1, body.position(), { moment: "broken", target: String(self.ref()) }, 24);
                        WorldFeedback.text(scope, roostAbove(body.position()), roostTextBroken, [], 24);
                        done(inner);
                        return;
                    }
                    const healed = roostHeal(scope, self, total / chunks, "roost");
                    left = left - 1;
                    WorldFeedback.emit(scope, roostScene, 1, body.position(),
                        { moment: "heal", target: String(self.ref()), left: left, total: chunks, healed: Math.round(healed * 10) / 10,
                            scale: scale, restRate: restRate, deep: deep ? 1 : 0 }, 24);
                    if (left <= 0) {
                        sound(inner, "minecraft:entity.parrot.fly");
                        WorldFeedback.emit(scope, roostScene, 1, body.position(), { moment: "rise", target: String(self.ref()), scale: scale }, 24);
                        WorldFeedback.text(scope, roostAbove(body.position()), roostTextRise, [], 24);
                        done(inner);
                        return;
                    }
                    inner.after(interval, step);
                }
                current.after(interval, step);
            }

            /** 空中：先选脚下一点向下落，落地才继续；撞住或超预算只收势。 */
            function descend(current: CombatAction, elapsed: number): void {
                const scope = current.world(), now = scope.observe(self);
                if (!now) { done(current); return; }
                if (now.grounded()) { perch(current); return; }
                if (elapsed >= roostFallBudget) { done(current); return; }
                const feet = now.position().minus(WorldCombat.point(0, now.height() / 2, 0));
                const moved = scope.displace(self, WorldCombat.point(0, -roostFallStep, 0));
                const after = scope.observe(self), at = after === null ? now.position() : after.position();
                WorldFeedback.emit(scope, roostScene, 1, at,
                    { moment: "descend", target: String(self.ref()), downdraft: downdraft, scale: fallScale,
                        path: [[feet.x(), feet.y(), feet.z()], [feet.x(), feet.y() - Math.max(0.1, moved), feet.z()]] }, 14);
                if (moved <= 0 && after !== null && !after.grounded()) { done(current); return; }
                current.after(1, function (next: CombatAction) { descend(next, elapsed + 1); });
            }

            if (body.grounded()) perch(action); else descend(action, 0);
        }
    });
}
