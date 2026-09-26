/**
 * 晨光 / Morning Sun —— 执行组织。
 *
 * 核心念头：把初升的日光一次拽到身上。白天晴空（或共享语义烈日）下这一口最足，还带一阵晨间的轻快；夜里或阴雨只剩下一点余光。
 *
 * 出手：共享节奏，短促迎候（时长随速度缩短），准备期间仍可正常移动，不新增站桩。
 * 结果：提交后按 heal（白天晴空 × 特攻）一次补回生命；若真的接住了晨光，再给自己一段 minecraft:speed。
 *   治疗与速度分别记录实际结果：没回进生命就不播回血成功，速度被拒（或已有更强提速）也不报振作成功。
 * 反制：迎候期可被打断（不花 PP）；夜里或雨天动用只回下限、也不带加速，所以要看天。
 */
namespace PokemonSkills {
    const morningsunScene = "world_combat:move_morningsun";
    const morningsunTextDawn = "world_combat.move.morningsun.text.dawn";
    const morningsunTextDim = "world_combat.move.morningsun.text.dim";

    function morningsunAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    /** 回复走共享健康写入：宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function morningsunHeal(world: CombatWorld, self: CombatActor, missing: number, fraction: number): number {
        var amount = Math.max(0, missing) * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            var pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, self, pokemon, amount / scale, "morningsun");
        } else {
            healed = world.health(self, amount, "world_combat:morningsun");
        }
        return healed;
    }

    define({
        id: morningsunId, name: "晨光",
        description: "把白天晴空的日光一次拽到身上：接住晨光时按已损失生命的三分之二左右回复并获得一段速度提升，夜里或阴雨只回一点、也没有加速；迎候期间可以正常移动。",
        uses: ["白天晴空下的强回复", "借回复接一段加速", "夜里只作小补"],
        kind: "self", range: 0, prepare: 0, active: 0, recover: 10, cooldown: 210, style: "dawn",
        stationary: false, maximumTicks: 300,
        defaults: {},
        fields: [],
        indicator: function () { return { radius: 1, style: "dawn", label: "晨光" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[morningsunId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.max(4, Math.round(p(morningsunId, "sunriseTicks", context))),
                recover: 10, cooldown: Math.max(60, Math.round(p(morningsunId, "cooldown", context))), active: 0, range: 0 };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            var dawn = body ? (morningsunDawnAt(world, body.position()) ? 1 : 0) : 0;
            action.present("morningsun:windup", morningsunScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dawn: dawn, windupRate: 8 + dawn * 10, target: String(self.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var point = body.position();
            var dawn = morningsunDawnAt(world, point);
            var missing = Math.max(0, body.maxHealth() - body.health());
            var before = body.health();
            morningsunHeal(world, self, missing, p(morningsunId, "heal", action));
            var after = world.observe(self);
            var gained = after ? Math.max(0, after.health() - before) : 0;
            var share = missing > 0 ? Math.max(0, Math.min(1, gained / missing)) : 0;
            // 治疗与振作分别记录：先按实际进账决定回血画面，再按实际提速结果决定振作画面。
            var vigor = dawn ? Math.max(20, Math.round(p(morningsunId, "vigorTicks", action))) : 0;
            var vigorApplied = false;
            if (vigor > 0) {
                MobEffects.apply(world, self, "minecraft:speed", vigor, 0);
                var current = MobEffects.read(world, self, "minecraft:speed");
                // 只有在身法上确实挂着本招的提速（0 级）时才算振作成功；更强来源不被较弱覆盖，也不冒认。
                vigorApplied = current !== null && current.amplifier() === 0;
            }
            var bursts = Math.max(10, Math.min(56, Math.round(12 + (dawn ? 30 : 6) + share * 18)));
            world.sound("minecraft:block.moss.place", point, 16, "{}");
            if (gained > 0) {
                WorldFeedback.emit(world, morningsunScene, 1, point,
                    { moment: "dawn", target: String(self.ref()), dawn: dawn ? 1 : 0, share: share,
                        bursts: bursts, scale: dawn ? 1.5 : 0.85, rays: dawn ? 16 : 6 }, 34);
            } else {
                WorldFeedback.emit(world, morningsunScene, 1, point,
                    { moment: "hush", target: String(self.ref()), dawn: dawn ? 1 : 0, scale: dawn ? 1 : 0.7 }, 26);
            }
            if (vigorApplied) {
                sound(action, "minecraft:block.amethyst_block.chime");
                WorldFeedback.emit(world, morningsunScene, 1, point,
                    { moment: "vigor", target: String(self.ref()), scale: 1 }, 36);
            }
            WorldFeedback.text(world, morningsunAbove(point), gained > 0 ? morningsunTextDawn : morningsunTextDim, [], 30);
            done(action);
        }
    });
}
