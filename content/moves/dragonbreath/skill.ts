/**
 * 龙息 / dragonbreath 的出手方式。
 *
 * 念头的形状：先深吸一口气（windup，提交前只播预告）→ 朝固定方向喷出一道扇形吐息（breath），
 * 气流由近及远逐步铺满整片锥形，先被扫到的目标先吃伤（impact），同一目标只吃一次 → 收尾留一缕雾气（linger）。
 *
 * 方向与遮挡：`kind: "aim"` 在提交时锁定一个方向，之后不追着目标转向；可以选择空地空喷。判定用的
 * `WorldGeometry.sector` 与表现用的 sector/arc 形状读同一组刻刻推进的 span／arc，玩家看到的锥面就是会被扫到的地；
 * 每个候选目标还要通过 `world.clear` 的真实通视检查，墙后的敌人不会被扫到，前沿到哪、能不能打到都从画面读得出。
 * 推进按**实际刻数**走：`breathTicks` 是真实总时长，每刻推进一段，`elapsed` 不再按 2 刻走。
 * 表现由本次 execute 建立的 `WorldFeedback.actionScenes` 持有，每刻上传正在推进的前沿与新扫过的环带，结束即停。
 * 两幕：windup → breath（可带多个 impact）+ linger。提交后才触碰世界。
 */
namespace PokemonSkills {
    const dragonbreathScene = "world_combat:move_dragonbreath";
    const dragonbreathHitText = "world_combat.move.dragonbreath.text.hit";
    const dragonbreathMissText = "world_combat.move.dragonbreath.text.miss";

    define({
        id: "dragonbreath",
        name: "Dragon Breath",
        description: "深吸一口气，朝锁定方向喷出一道扇形龙息：锥形由近及远铺满，扫中的敌人每个只吃一次伤害、越远力道越弱，并有机会被麻住——麻痹会拖慢移动，还让出招有概率失败。可以对着空地空喷，墙会挡住气息。",
        uses: ["喷出一道扇形吐息扫过身前一片", "一次扫到排成一列的多个敌人", "让被扫到的对手陷入麻痹"],
        kind: "aim",
        range: 5,
        maxRange: 7,
        prepare: 8,
        active: 26,
        recover: 10,
        cooldown: 30,
        style: "breath",
        defaults: { wide: true, ai: { maxChase: 9, cluster: true, opening: "anytime" } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["dragonbreath"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var wide = !(config && config.wide === false);
            return {
                prepare: p("dragonbreath", "prepare", context) + (wide ? 0 : 2),
                recover: p("dragonbreath", "recover", context),
                cooldown: p("dragonbreath", "cooldown", context) + (wide ? 0 : 4),
                range: p("dragonbreath", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragonbreath:windup", dragonbreathScene, 1, action.origin(), JSON.stringify({ moment: "inhale", wide: !(config && config.wide === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            // 方向在提交时锁定，空喷也成立；锥面随后由近及远推进。
            const direction = aim(action);
            const reach = p("dragonbreath", "reach", action);
            const arc = Math.max(24, Math.round(p("dragonbreath", "arc", action)));
            const power = p("dragonbreath", "breath", action);
            const chance = p("dragonbreath", "numbChance", action);
            const ticks = Math.max(6, Math.round(p("dragonbreath", "breathTicks", action)));
            const limit = Math.max(1, Math.round(p("dragonbreath", "maxTargets", action)));
            const hitRefs: { [ref: string]: boolean } = {};
            const flat = WorldGeometry.flatUnit(direction, action.direction());
            const heading = [flat.x(), flat.y(), flat.z()];
            // 整个吐息段由本次 execute 持有：每刻把正在推进的 span/arc 上传，收势时统一 stop／finish。
            const scenes = WorldFeedback.actionScenes(dragonbreathScene, 1);
            let hits = 0, elapsed = 0, previous = 0;

            sound(action, "cobblemon:move.dragonclaw.actor");
            function finish(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null)
                    WorldFeedback.emit(scope, dragonbreathScene, 1, body.position(), { moment: "linger", hits: hits }, 24);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.4, 0)), hits > 0 ? dragonbreathHitText : dragonbreathMissText, hits > 0 ? [hits] : [], 28);
                scenes.finish(current, done);
            }
            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                // 每刻按真实刻数推进一段：ticks 刻走完整条吐息，声明时长与实际时长一致。
                const grow = Math.min(1, (elapsed + 1) / ticks);
                const span = Math.max(0.6, reach * grow);
                const region = WorldGeometry.sector(here, direction, span, arc, { below: 2, above: 3 });
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    const key = String(target.ref());
                    if (hitRefs[key] || hits >= limit) return;
                    // 块遮挡按真实可见段：墙后的目标这一口扫不到。
                    if (!scope.clear(here, facts.position())) return;
                    hitRefs[key] = true;
                    const distance = facts.position().minus(here).length();
                    const gain = Math.max(0.55, 1 - (distance / Math.max(1, reach)) * 0.4);
                    const landed = hurt(current, target, "dragonbreath", power * gain,
                        { damage: damageSpec("dragonbreath", "breath"), status: "paralysis", chance: chance });
                    if (!landed) return;
                    hits++;
                    WorldFeedback.emit(scope, dragonbreathScene, 1, facts.position(),
                        { moment: "impact", target: key, intensity: Math.max(0.5, Math.min(1.8, power / 60)) }, 26);
                });
                // 判定扇区与画出的前沿／新扫过环带来自同一组 span/arc：前沿到哪、哪才会被扫到。
                scenes.show(current, "breath", here,
                    { moment: "breath", direction: heading, reach: span, inner: Math.max(0, previous - 0.1), arc: arc,
                        flow: Math.round(span * 22), scale: span / Math.max(1, reach) });
                previous = span;
                elapsed++;
                if (elapsed >= ticks) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }
            advance(action);
        }
    });
}
