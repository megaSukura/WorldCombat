/**
 * 怒火中烧 / fierywrath 的出手方式。
 *
 * 核心念头：把憋住的怒火从身体里炸开成一道环状气场——它必须以自己为中心，所以得先把自己送进人堆里；
 * 近处被灼得更狠，圈内所有人被震得可能懵住；开启余怒时气场还留在最初中心一会儿，持续灼烧没走开的人。
 *
 * 三幕：
 *   起（windup，提交前）：身体发抖、暗红火焰朝身内收拢的预告。
 *   击（burst → hit）：提交后以自身为中心炸开气场，按到中心的距离衰减对圈内敌人各结算一次，掷一次畏缩并向外轻推。
 *   收（aura / scorch / fade）：余怒式在爆发中心立起一段持续气场，按 `pulseTicks` 反复灼烧还在圈里的人；
 *       气场不跟着人走。否则一次即止。
 *
 * 配置 `linger`（余怒）由 resolve 改时序、由公式改爆发威力与推距：开启＝留场持续，关闭＝一发更重。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`）并投递
 * `world_combat:interrupt`；全局起手门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    const fierywrathScene = "world_combat:move_fierywrath";
    const fierywrathFlinchEffect = "world_combat:fierywrath_flinch";
    const fierywrathFlinchText = "world_combat.move.fierywrath.text.flinch";
    const fierywrathHitText = "world_combat.move.fierywrath.text.hit";
    const fierywrathMissText = "world_combat.move.fierywrath.text.miss";

    function fierywrathFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, fierywrathFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        id: "fierywrath",
        name: "Fiery Wrath",
        description: "把恶属性的怒火从身体里炸开成一道以自身为中心的环状气场：圈内敌人按距离近重远轻地吃伤，被震实的可能畏缩并被向外轻推。要站进人堆中央才打得到人；余怒式还会在爆发中心留下一段持续怒焰，反复灼烧没走开的人，爆发式一发更重。",
        uses: ["被围住时一次性清一圈", "把贴身围上来的敌人震得畏缩并打断它们", "守住一块地方", "对自己越危急打得越痛"],
        kind: "self",
        range: 3,
        maxRange: 5.5,
        prepare: 10,
        active: 22,
        recover: 8,
        cooldown: 60,
        style: "dark-fire",
        defaults: { linger: false, ai: { maxChase: 9, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("fierywrath", "auraRadius", pokemon), geometry: "area", style: "dark-fire", label: config && config.linger === true ? "余怒气场" : "爆发气场" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon, skill: skills["fierywrath"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var linger = !!(config && config.linger);
            return {
                prepare: p("fierywrath", "prepare", context) + (linger ? 2 : 0),
                recover: p("fierywrath", "recover", context),
                cooldown: p("fierywrath", "cooldown", context) + (linger ? 10 : -2),
                active: skills["fierywrath"].active,
                range: p("fierywrath", "auraRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("fierywrath:seethe", fierywrathScene, 1, action.origin(),
                JSON.stringify({ moment: "seethe", linger: config && config.linger === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const body = world.observe(self);
            const centre = body !== null ? body.position() : action.origin();
            const scenes = WorldFeedback.actionScenes(fierywrathScene);
            const radius = p("fierywrath", "auraRadius", action);
            const power = p("fierywrath", "wrath", action);
            const edgeKeep = p("fierywrath", "edgeKeep", action);
            const push = p("fierywrath", "push", action);
            const chance = p("fierywrath", "flinchChance", action);
            const flinchTicks = Math.round(p("fierywrath", "flinchTicks", action));
            const afterglow = p("fierywrath", "afterglow", action);
            const lingerTicks = Math.max(10, Math.round(p("fierywrath", "lingerTicks", action)));
            const pulseTicks = Math.max(2, Math.round(p("fierywrath", "pulseTicks", action)));
            const linger = !!(config && config.linger);
            const scale = radius / 3.0;
            // 全部以施法者此刻的真实身体中心为圆心；气场的距离衰减也读这里。
            const region = WorldGeometry.ring(centre, 0, radius, { below: 2, above: 4 });
            let elapsed = 0, settled = false;

            function finish(current: CombatAction, struck: number): void {
                if (settled) return;
                settled = true;
                if (struck === 0) {
                    WorldFeedback.emit(current.world(), fierywrathScene, 1, centre, { moment: "miss", scale: scale, radius: radius }, 20);
                    WorldFeedback.text(current.world(), centre.plus(WorldCombat.point(0, 1.2, 0)), fierywrathMissText, [], 22);
                }
                scenes.finish(current, done);
            }

            /** 一次结算：按到自身的距离衰减，圈内每个敌人各挨一次。 */
            function strike(current: CombatAction, amount: number, segment: string, withFlinch: boolean, moment: string): number {
                const scope = current.world();
                let touched = 0;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    if (String(enemy.ref()) === String(current.actor().ref())) return;
                    const distance = facts.position().minus(centre).length();
                    const near = radius <= 0.001 ? 1 : Math.max(edgeKeep, 1 - (1 - edgeKeep) * (distance / radius));
                    const damage = amount * near;
                    if (!hurt(current, enemy, "fierywrath", damage, { damage: damageSpec("fierywrath", segment) })) return;
                    touched++;
                    WorldFeedback.emit(scope, fierywrathScene, 1, facts.position(),
                        { moment: moment, target: String(enemy.ref()), scale: scale, near: near, intensity: Math.max(0.5, Math.min(2.2, damage / 70)) }, 24);
                    if (withFlinch && scope.random() < chance && fierywrathFlinch(scope, enemy, flinchTicks)) {
                        WorldFeedback.emit(scope, fierywrathScene, 1, facts.position(), { moment: "flinch", target: String(enemy.ref()) }, 24);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.15, 0)), fierywrathFlinchText, [], 26);
                    }
                    if (scope.valid(enemy)) {
                        const away = facts.position().minus(centre);
                        if (away.length() > 0.15) scope.displace(enemy, away.unit().scale(push));
                    }
                });
                return touched;
            }

            function pulse(current: CombatAction, struck: number): void {
                const touched = strike(current, afterglow, "afterglow", false, "scorch");
                if (touched > 0) WorldFeedback.emit(current.world(), fierywrathScene, 1, centre,
                    { moment: "pulse", scale: scale, radius: radius, marks: Math.max(6, touched * 6) }, 22);
                elapsed += pulseTicks;
                if (elapsed >= lingerTicks) {
                    WorldFeedback.emit(current.world(), fierywrathScene, 1, centre, { moment: "fade", scale: scale, radius: radius }, 26);
                    finish(current, struck);
                    return;
                }
                current.after(pulseTicks, function (next) { pulse(next, struck); });
            }

            sound(action, "minecraft:entity.blaze.shoot");
            const struck = strike(action, power, "wrath", true, "hit");
            WorldFeedback.emit(world, fierywrathScene, 1, centre,
                { moment: "burst", scale: scale, radius: radius, marks: Math.max(10, struck * 8), intensity: Math.max(0.5, Math.min(2.2, power / 90)) }, 28);
            if (struck > 0) WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.2, 0)), fierywrathHitText, [struck], 26);
            sound(action, "cobblemon:impact.dark");
            if (linger && world.valid(self)) {
                // 余怒气场钉在爆发时的中心，由 actionScenes 维持，fade 时随动作结束清理；不跟着人走。
                scenes.show(action, "aura", centre,
                    { moment: "aura", scale: scale, radius: radius, marks: Math.max(8, struck * 6) });
                pulse(action, struck);
            } else finish(action, struck);
        }
    });

}
