/**
 * 月光 / Moonlight —— 执行组织。
 *
 * 核心念头：把清冷的月色披到身上。夜里晴空这一口最足，还顺带把灼伤冷却掉；白天或阴雨只剩下一点余光。
 *
 * 出手：共享节奏，短促准备（承月时长随速度缩短）。windup 在提交前判定此刻能不能见到月色，并把它写进预告。
 * 结果：提交后按 heal（夜里晴空 × 亲密度）补回生命，并冷却掉灼伤（CombatStatus.cure 走共享身份，任何来源的
 *   灼伤都算）；若真的接住月色，画面里再落下一层银色薄雾。
 * 反制：准备期可被打断（不花 PP）；白天动用只回下限、也没月色可言，所以要看天。
 */
namespace PokemonSkills {
    const moonlightScene = "world_combat:move_moonlight";
    const moonlightTextVeil = "world_combat.move.moonlight.text.veil";
    const moonlightTextDim = "world_combat.move.moonlight.text.dim";
    const moonlightTextSoothe = "world_combat.move.moonlight.text.soothe";

    function moonlightAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    function moonlightHeal(world: CombatWorld, self: CombatActor, missing: number, fraction: number): number {
        var amount = Math.max(0, missing) * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            var pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, self, pokemon, amount / scale, "moonlight");
        } else {
            healed = world.health(self, amount, "world_combat:moonlight");
        }
        var after = world.observe(self);
        if (healed > 0 && after) feedback(world, self, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    /** 夜里且天晴：共享语义天气在场时不算晴夜；无现场时读原生世界。 */
    function moonlightSkyAt(world: CombatWorld, point: CombatPoint): boolean {
        if (WorldEnvironment.weather(world, point) !== null) return false;
        var env = WorldEnvironment.read(world, point);
        return !!(env && env.loaded && !env.day && env.skyVisible && (env.rain || 0) < 0.05 && (env.thunder || 0) < 0.05);
    }

    define({
        id: moonlightId, name: "月光",
        description: "把夜里晴空的月色披到身上：接住月色时按缺失生命的三分之二左右回复并冷却掉灼伤，白天或阴雨只回一点。",
        uses: ["夜里晴空下的强回复", "顺手冷却灼伤", "白天只作小补"],
        kind: "self", range: 0, prepare: 0, active: 0, recover: 10, cooldown: 220, style: "moon",
        maximumTicks: 300,
        defaults: {},
        fields: [],
        indicator: function () { return { radius: 1, style: "moon", label: "月光" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[moonlightId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.max(4, Math.round(p(moonlightId, "moonriseTicks", context))),
                recover: 10, cooldown: Math.max(60, Math.round(p(moonlightId, "cooldown", context))), active: 0, range: 0 };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01 && !CombatStatus.has(world, self, "burn")) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            var moon = body ? (moonlightSkyAt(world, body.position()) ? 1 : 0) : 0;
            action.present("moonlight:windup", moonlightScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", moon: moon, windupRate: 8 + moon * 10, target: String(self.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var point = body.position();
            var moon = moonlightSkyAt(world, point);
            var missing = Math.max(0, body.maxHealth() - body.health());
            var before = body.health();
            moonlightHeal(world, self, missing, p(moonlightId, "heal", action));
            var after = world.observe(self);
            var gained = after ? Math.max(0, after.health() - before) : 0;
            var cooled = CombatStatus.cure(world, self, "burn");
            var share = missing > 0 ? Math.max(0, Math.min(1, gained / missing)) : 0;
            var bursts = Math.max(10, Math.min(56, Math.round(12 + (moon ? 30 : 6) + share * 18)));
            world.sound("minecraft:block.amethyst_block.resonate", point, 16, "{}");
            WorldFeedback.emit(world, moonlightScene, 1, point,
                { moment: "veil", target: String(self.ref()), moon: moon ? 1 : 0, share: share,
                    bursts: bursts, scale: moon ? 1.4 : 0.85, drops: moon ? 18 : 6 }, 34);
            WorldFeedback.text(world, moonlightAbove(point), gained > 0 ? moonlightTextVeil : moonlightTextDim, [], 30);
            if (cooled) {
                sound(action, "minecraft:block.moss.place");
                WorldFeedback.emit(world, moonlightScene, 1, point,
                    { moment: "soothe", target: String(self.ref()), scale: 1 }, 30);
                WorldFeedback.text(world, moonlightAbove(point), moonlightTextSoothe, [], 30);
            }
            done(action);
        }
    });
}
