/**
 * 灵魂冲击 / spiritbreak —— 注册与动作。
 *
 * 核心念头：把一股压人的妖精气势收拢到身上，低头沿直线朝对手撞上去。命中的那一下把对手的气势打散
 *   （特攻 −1），并把冲击化作一圈向外炸开的妖精光环，把人推得踉跄后退。它是削势二式里唯一贴身、
 *   唯一物理、唯一掉特攻的一个。
 *
 * 两幕：
 *   起（windup，提交前）：气势从四周收拢包住全身、越收越亮（`action.present` 预告）。
 *   撞（rush → smash → aura）：提交后逐刻沿瞄准方向冲锋，身周拖着妖精气流；命中活物时结算一次
 *     接触物理伤害、必然掉特攻（`NativeEffects.boost(spa, -stages)`）、把目标沿冲锋方向推开，
 *     并在冲击点炸开一圈妖精光环。撞空或撞墙就收势。
 *
 * 与同族分开：泼冷水是远程单体、留湿身、掉攻击；灵魂冲击是**贴身冲撞、纯气势、掉特攻**。
 * 配置 `shatter`（碎魂式）由公式改威力／掉级／击退／距离、由 resolve 改时序。
 */
namespace PokemonSkills {
    const spiritbreakScene = "world_combat:move_spiritbreak";
    const spiritbreakText = "world_combat.move.spiritbreak.text.smash";

    define({
        freeMovement: true,
        id: "spiritbreak",
        cooldownParameter: "wait",
        name: "Spirit Break",
        description: "把一股压人的妖精气势收拢到身上，低头撞向对手：命中时造成接触物理伤害、把对手的特攻打掉，并把人推开；冲击点炸开一圈妖精光环。碎魂式更重、掉特攻更多、推得更远，但冲得更短、回气更久。",
        uses: ["贴身压制一个法系输出", "把对手从阵型里撞开、打散它的特攻", "在狭窄空间里用冲撞抢身位"],
        kind: "enemy",
        range: 4.4,
        maxRange: 6.5,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 40,
        style: "spiritbreak",
        defaults: { shatter: false, ai: { maxChase: 10 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spiritbreak", "momentum", pokemon) + 0.8, geometry: "line", style: "spiritbreak",
                color: 0xF58CB8, label: config && config.shatter === true ? "碎魂式灵魂冲击" : "灵魂冲击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spiritbreak"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("spiritbreak", "tempo", context)),
                recover: Math.round(p("spiritbreak", "aftercast", context)),
                cooldown: Math.round(p("spiritbreak", "wait", context)),
                active: 0,
                range: Math.min(skills["spiritbreak"].maxRange!, p("spiritbreak", "momentum", context) + 1.0)
            };
        },
        windup: function (action, config, prepare) {
            action.present("spiritbreak:gather", spiritbreakScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shatter: config && config.shatter === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p("spiritbreak", "spirit", action);
            const momentum = Math.max(2.0, p("spiritbreak", "momentum", action));
            const pace = Math.max(0.7, p("spiritbreak", "pace", action));
            const radius = Math.max(0.4, p("spiritbreak", "cloak", action));
            const push = Math.max(0.2, p("spiritbreak", "push", action));
            const stages = Math.max(1, Math.min(2, Math.round(p("spiritbreak", "drop", action))));
            const sparks = Math.max(12, Math.round(p("spiritbreak", "sparks", action)));
            const halo = Math.max(30, Math.round(p("spiritbreak", "halo", action)));
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.55));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function smash(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), victim = hit.target(), point = hit.position();
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { finish(current); return; }
                const landed = impact(current, hit, "spiritbreak", power,
                    { damage: damageSpec("spiritbreak", "spirit"), contact: true });
                WorldFeedback.emit(scope, spiritbreakScene, 1, point,
                    { moment: "smash", target: String(victim.ref()), drop: stages, sparks: sparks, scale: scale, intensity: intensity }, 26);
                sound(current, "cobblemon:impact.fairy");
                if (landed && scope.valid(victim)) {
                    NativeEffects.boost(scope, victim, "spa", -stages);
                    scope.displace(victim, direction.scale(push));
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), spiritbreakText, [stages], 30);
                }
                WorldFeedback.emit(scope, spiritbreakScene, 1, point,
                    { moment: "aura", radius: radius * 3, sparks: sparks, drop: stages, halo: halo, scale: scale, intensity: intensity }, 26);
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const step = Math.min(pace, Math.max(0, momentum - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(here, here.plus(delta.scale(1.6)), radius);
                if (hit.hitEntity()) { smash(current, hit); return; }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= momentum) { finish(current); return; }
                WorldFeedback.keep(scope, "spiritbreak:wake:" + String(actor.ref()), spiritbreakScene, 1, here,
                    { moment: "rush", sparks: sparks, scale: scale, intensity: intensity }, 8);
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:entity.iron_golem.attack");
            WorldFeedback.emit(world, spiritbreakScene, 1, action.origin(),
                { moment: "rush", sparks: sparks, scale: scale, intensity: intensity }, 20);
            advance(action);
        }
    });
}
