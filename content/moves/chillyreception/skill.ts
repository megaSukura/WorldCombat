/**
 * 冷笑话 / chillyreception 的出手方式。
 *
 * 念头的形状（两幕接一段持续）：
 *  1) 冷场——施法者清一下嗓子、把一句冷到没人接得住的话抛出去（windup：嘴边浮起细霜与悬着的话音，并预告
 *     一圈冷场与预计退路）；提交后话音落下，身边一圈**有视线**的敌人各自接到一次真实计数过的短打断
 *     （`LivingActions.requestInterrupt` 只数真正结束的动作；无法打断／免疫的动作照常继续），并挂上「冷场」身份；
 *     雪花随之在施法者周围落下。
 *  2) 交接——施法者趁这片安静沿背离最近威胁的方向，**逐段踩在真实支撑上**退开（最多 withdraw 格）：
 *     有合法后备就在实际退到的脚点换手；没有后备就用同样的有限退步留在场上。
 *  3) 雪停——留在原地的雪区（detachedField，挂在自持 body 上）到期散去，不随换人消失。
 *
 * 提交前只播预告；雪区与退场都在提交后写。核心退场不依赖打断是否成功。
 */
namespace PokemonSkills {
    /** 背离最近敌人的水平方向；附近没有敌人时返回 null。 */
    function chillyHeading(world: CombatWorld, actor: CombatActor, body: CombatObservation): CombatPoint | null {
        const centre = body.position();
        const actors = world.query(centre, 24, false);
        let found = false, nearest = 0, awayX = 0, awayZ = 0;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.ref()) === String(actor.ref()) || world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null) continue;
            const dx = facts.position().x() - centre.x(), dz = facts.position().z() - centre.z();
            const square = dx * dx + dz * dz;
            if (!found || square < nearest) { found = true; nearest = square; awayX = dx; awayZ = dz; }
        }
        if (!found) return null;
        const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
        if (!(length >= 0.01)) return null;
        return WorldCombat.point(-awayX / length, 0, -awayZ / length);
    }
    /**
     * 退路：沿背离方向用原生 collider 逐段前进，每一段都要求落点有上表面支撑、抬升／横越／下落走廊畅通
     * （`SurfacePaths.advance`）。返回真实能退到的脚点与已走距离；一步都站不住就停在原地。
     */
    function chillyExit(world: CombatWorld, actor: CombatActor, body: CombatObservation, distance: number): SurfacePaths.Step {
        const feet = partyFeet(body);
        const heading = chillyHeading(world, actor, body);
        if (!(distance > 0) || heading === null) return { point: feet, path: [feet], travelled: 0, ended: true };
        return SurfacePaths.advance(world, feet, heading, distance, { up: 1, down: 1, spacing: 0.5, samples: 40 });
    }

    define({
        freeMovement: true,
        id: "chillyreception",
        name: "冷笑话",
        description: "抛出一句冷笑话，给身边一圈有视线的敌人一次可被免疫的短打断、并留下会持续一段时间的雪区，自己趁势沿有支撑的方向退开最多一段距离；有后备时直接与待命的一只在退到的脚点换手，没有后备就留在场上。",
        uses: ["被围住时开一条退路", "打断身边几个敌人一次", "退场前顺手把雪留在原地"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 160,
        style: "cold",
        defaults: { punchline: false },
        fields: [flag("punchline", "重梗冷场")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("chillyreception", "silenceRadius", pokemon) : 7, geometry: "area", style: "cold",
                color: 0xB8C4D0, label: config && config.punchline ? "重梗冷场" : "轻描淡写" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["chillyreception"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const punchline = !!(config && config.punchline);
            return {
                prepare: Math.max(6, Math.round(p("chillyreception", "gather", context))),
                recover: Math.max(4, Math.round(p("chillyreception", "settle", context))),
                cooldown: Math.max(60, p("chillyreception", "cooldown", context) + (punchline ? 18 : -12)),
                active: skills["chillyreception"].active,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor(), body = world.observe(actor);
            const direction = body === null ? null : chillyHeading(world, actor, body);
            action.present("world_combat:move_chillyreception:windup", chillyScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("chillyreception", "silenceRadius", action),
                    withdraw: p("chillyreception", "withdraw", action),
                    direction: direction ? [direction.x(), direction.y(), direction.z()] : [0, 0, 0],
                    punchline: config && config.punchline ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const point = body.position();
            const silenceRadius = p("chillyreception", "silenceRadius", action);
            const hush = Math.max(20, Math.round(p("chillyreception", "hushTicks", action)));
            const snowRadius = p("chillyreception", "snowRadius", action);
            const snowTicks = Math.max(80, Math.round(p("chillyreception", "snowTicks", action)));
            const density = Math.round(p("chillyreception", "snowDensity", action));
            const withdraw = p("chillyreception", "withdraw", action);
            WorldEnvironment.replaceOwnWeather(world, actor);
            const targets = world.query(point, silenceRadius, false);
            let hushed = 0;
            for (let i = 0; i < targets.length; i++) {
                const other = targets[i];
                if (String(other.ref()) === String(actor.ref()) || world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                // 冷场要看得见：墙后的敌人不吃这次打断，也不挂冷场身份。
                if (!world.clear(point, facts.position())) continue;
                // 只数真正结束的动作；无法打断／免疫的原生动作 requestInterrupt 返回 0，不算冷场成功。
                const stopped = LivingActions.requestInterrupt(world, other) > 0;
                MobEffects.apply(world, other, chillySilence, hush, 0);
                if (stopped) {
                    WorldFeedback.emit(world, chillyScene, 1, facts.position(),
                        { moment: "silence", target: String(other.ref()), scale: silenceRadius / 7 }, 24);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1, 0)), chillyHushText, [], 24);
                    hushed++;
                }
            }
            // 雪区挂在自持的临时 body 上：施法者被换下/收回后雪仍留在原地，按自身时钟走完。
            WorldEffects.detachedField(world, chillyField, point, snowRadius, { density: density, hush: hush }, snowTicks);
            WorldFeedback.emit(world, chillyScene, 1, point,
                { moment: "burst", radius: silenceRadius, density: density, hushed: hushed, snowTicks: snowTicks }, 44);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), chillyJokeText, [hushed], 30);

            const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
            MobEffects.apply(world, actor, chillySnow, Math.max(40, hush), 0);
            world.sound("cobblemon:move.powdersnow.actor", point, 24, "{}");
            const heading = chillyHeading(world, actor, body);
            let travelled = 0;
            function finish(current: CombatAction): void {
                const scope = current.world(), stand = scope.observe(actor);
                if (stand === null) return;
                const at = stand.position();
                WorldFeedback.emit(scope, chillyScene, 1, at,
                    { moment: "bow", radius: withdraw, escaped: travelled > 0.5 ? 1 : 0 }, 26);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.4, 0)), chillyBowText, [], 26);
                // Native recall ends this actor's action; leave it immediately after a successful handoff.
                if (reserve !== null && partySwitchOut(scope, actor, reserve.slot, partyFeet(stand)).ok) return;
                done(current);
            }
            function retreat(current: CombatAction): void {
                const scope = current.world(), stand = scope.observe(actor);
                if (stand === null) return;
                if (heading === null || travelled >= withdraw - 0.01) { finish(current); return; }
                const feet = partyFeet(stand);
                const step = SurfacePaths.advance(scope, feet, heading, Math.min(0.4, withdraw - travelled),
                    { up: 1, down: 1, spacing: 0.2, samples: 4 });
                if (step.travelled <= 0.01) { finish(current); return; }
                const moved = LivingActions.step(scope, actor, step.point.minus(feet), 4);
                travelled += moved;
                if (moved <= 0.01) { finish(current); return; }
                current.after(1, retreat);
            }
            retreat(action);
        }
    });
}
