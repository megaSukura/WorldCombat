/**
 * 光合作用 / Synthesis —— 执行组织。
 *
 * 核心念头：摊开叶片，把此刻照到身上的光合成生命；光越足，回得越多，但吸收期间原地站定。
 *
 * 出手：共享节奏，stationary——准备期整段不能移动（这是这招的代价）。windup 在提交前读一次日照，
 *   用它的强弱预告这次能收多少光。
 * 结果：提交后在原地绽放一团叶光，按 heal（日照 + 特防）把缺失生命补回；画面里的叶数与尺寸取自同一
 *   份日照与回复量，所以站在正午的草地上与站在树荫里的两次施放看起来就不一样。
 * 反制：站定就是余地——准备期可以被任何伤害打断（不花 PP），所以要在安全窗口里摊叶。
 */
namespace PokemonSkills {
    const synthesisScene = "world_combat:move_synthesis";
    const synthesisTextBloom = "world_combat.move.synthesis.text.bloom";
    const synthesisTextLow = "world_combat.move.synthesis.text.low";

    function synthesisAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

    /** 回复走共享健康写入：宝可梦经过 NativeEffects.heal，其他战斗者直接写 MC 生命。 */
    function synthesisHeal(world: CombatWorld, self: CombatActor, missing: number, fraction: number): number {
        var amount = Math.max(0, missing) * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            var pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, self, pokemon, amount / scale, "synthesis");
        } else {
            healed = world.health(self, amount, "world_combat:synthesis");
        }
        var after = world.observe(self);
        if (healed > 0 && after) feedback(world, self, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    define({
        id: synthesisId, name: "光合作用",
        description: "在原地摊开叶片，把此刻照到身上的阳光合成生命：日照越足回复越多，晴天正午接近补回三分之二，夜里或树荫下只回一点；准备期间不能移动。",
        uses: ["在阳光下补一大口生命", "树荫里的小幅回血", "站定窗口里的自救"],
        kind: "self", range: 0, prepare: 0, active: 0, recover: 12, cooldown: 240, style: "photosynthesis",
        stationary: true, maximumTicks: 300,
        defaults: {},
        fields: [],
        indicator: function () { return { radius: 1, style: "photosynthesis", label: "光合作用" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[synthesisId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.max(4, Math.round(p(synthesisId, "soakTicks", context))),
                recover: 12, cooldown: Math.max(60, Math.round(p(synthesisId, "cooldown", context))), active: 0, range: 0 };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            var light = body ? WorldEnvironment.sunlight(world, body.position()) : 0;
            action.present("synthesis:windup", synthesisScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", light: light, target: String(self.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var point = body.position();
            var light = WorldEnvironment.sunlight(world, point);
            var missing = Math.max(0, body.maxHealth() - body.health());
            var fraction = p(synthesisId, "heal", action);
            var before = body.health();
            synthesisHeal(world, self, missing, fraction);
            var after = world.observe(self);
            var gained = after ? Math.max(0, after.health() - before) : 0;
            var share = missing > 0 ? Math.max(0, Math.min(1, gained / missing)) : 0;
            var bursts = Math.max(10, Math.min(60, Math.round(12 + light * 30 + share * 20)));
            world.sound("minecraft:block.moss.place", point, 16, "{}");
            WorldFeedback.emit(world, synthesisScene, 1, point,
                { moment: "bloom", target: String(self.ref()), light: light, share: share,
                    bursts: bursts, scale: 1 + light * 1.2, petalSize: 0.10 + light * 0.10 }, 34);
            WorldFeedback.text(world, synthesisAbove(point), gained > 0 ? synthesisTextBloom : synthesisTextLow, [], 30);
            done(action);
        }
    });
}
