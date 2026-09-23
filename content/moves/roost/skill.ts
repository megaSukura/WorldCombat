/**
 * 羽栖 / Roost —— 执行组织。
 *
 * 核心念头：收拢双翼落回地面，贴着地把回复一口一口歇回来；歇着的时候它飞不起来，也就是最容易被抓住的一段。
 *
 * 出手：共享节奏。windup（提交前）只播预告——脚边气流先向下压，告诉对手「它要落地了」；准备可被打断，不花代价。
 * 落地（land，提交后）：扬尘与羽尘一圈铺开，给自己挂共享身份 world_combat:status/roosting（本单元效果
 *   world_combat:roosting），并在栖息窗口里失去飞行属性（NativeModifiers，对宝可梦生效）。
 * 栖息（rest）：把 heal 分成 chunks 段，每段间隔交付；每段前确认身份还在——身份被牛奶／`/effect clear` 提前清掉，
 *   或施法者离场，就按已交付的比例收尾（broken）。
 * 起身（rise）：整段交付完，收势起身。
 *
 * 反制：栖息窗口就是余地——对手可以趁着它失去飞行、贴在地面时集火，或直接清掉身份打断剩下的回复。
 * 与同族分开：月光／光合作用是读环境的一口结算；睡觉是不能行动、被打醒打折的整段恢复；羽栖是**落地分段、可被清除效果打断**的一口。
 */
namespace PokemonSkills {
    const roostScene = "world_combat:move_roost";
    const roostMark = "world_combat:roosting";
    const roostTextLand = "world_combat.move.roost.text.land";
    const roostTextRise = "world_combat.move.roost.text.rise";
    const roostTextBroken = "world_combat.move.roost.text.broken";

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

    /** 落地收翼：栖息期间失去飞行属性（地面招式与青草场地重新算得到它）；纯飞行或没有飞行的对象不动。 */
    function roostFold(world: CombatWorld, self: CombatActor, ticks: number): void {
        if (String(self.domain()) !== "cobblemon" || !world.valid(self)) return;
        var pokemon = CobblemonCombat.pokemon(self);
        var types = NativeEffects.types(pokemon, NativeEffects.read(world, self));
        var kept: string[] = [];
        for (var i = 0; i < types.length; i++) if (types[i] !== "flying") kept.push(types[i]);
        if (kept.length === types.length || kept.length < 1) return;
        NativeModifiers.apply(world, self, { types: kept }, ticks);
    }

    define({
        requiresGround: true,
        id: roostId, name: "羽栖",
        description: "收拢双翼落回地面，贴地栖息一段：回复分成几段交付，总量约最大生命的一半；栖息期间失去飞行属性、暴露在地面招式与青草场地之下，栖落状态被清除会打断剩下的回复。",
        uses: ["在受击间隙里分段补回生命", "用落地窗口换一口更稳的回复", "让飞禽暂时贴地、吃地形影响"],
        kind: "self", range: 0, prepare: 12, active: 0, recover: 10, cooldown: 220, style: "roost", maximumTicks: 260,
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
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var deep = config && config.deep === true;
            var total = Math.max(0.05, Math.min(0.9, p(roostId, "heal", action)));
            var rest = Math.max(20, Math.round(p(roostId, "restTicks", action)));
            var chunks = Math.max(2, Math.round(p(roostId, "chunks", action)));
            var feathers = Math.max(8, Math.round(p(roostId, "feathers", action)));
            var width = Math.max(0.6, p(roostId, "foldWidth", action));
            var interval = Math.max(4, Math.round(rest / chunks));
            var scale = Math.max(0.7, Math.min(1.8, width));
            var restRate = Math.max(6, Math.min(28, Math.round(feathers / 2)));

            MobEffects.apply(world, self, roostMark, rest + 20, 0);
            roostFold(world, self, rest + 20);

            sound(action, "minecraft:entity.parrot.fly");
            WorldFeedback.emit(world, roostScene, 1, body.position(),
                { moment: "land", target: String(self.ref()), burst: feathers, radius: width, scale: scale }, 30);
            WorldFeedback.text(world, roostAbove(body.position()), roostTextLand, [], 30);

            var left = chunks;
            function step(current: CombatAction): void {
                var access = current.world();
                if (!access.valid(self)) { done(current); return; }
                var now = access.observe(self);
                if (!now) { done(current); return; }
                if (MobEffects.read(access, self, roostMark) === null) {
                    WorldFeedback.emit(access, roostScene, 1, now.position(), { moment: "broken", target: String(self.ref()) }, 24);
                    WorldFeedback.text(access, roostAbove(now.position()), roostTextBroken, [], 24);
                    done(current);
                    return;
                }
                roostHeal(access, self, total / chunks, "roost");
                left = left - 1;
                WorldFeedback.emit(access, roostScene, 1, now.position(),
                    { moment: "rest", target: String(self.ref()), left: left, total: chunks, scale: scale, restRate: restRate, deep: deep ? 1 : 0 }, 24);
                if (left <= 0) {
                    sound(current, "minecraft:entity.parrot.fly");
                    WorldFeedback.emit(access, roostScene, 1, now.position(), { moment: "rise", target: String(self.ref()), scale: scale }, 24);
                    WorldFeedback.text(access, roostAbove(now.position()), roostTextRise, [], 24);
                    done(current);
                    return;
                }
                current.after(interval, step);
            }
            action.after(interval, step);
        }
    });
}
