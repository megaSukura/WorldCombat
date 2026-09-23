/**
 * 冷笑话 / chillyreception 的出手方式。
 *
 * 念头的形状（两幕接一段持续）：
 *  1) 冷场——施法者清一下嗓子、把一句冷到没人接得住的话抛出去（windup：嘴边浮起细霜与悬着的话音）；
 *     提交后话音落下，身边一圈的敌人被这阵尴尬冻住：当前动作被打断、仇恨暂时松开、脚被定住一会儿
 *     （cold_silence 身份 + 共享 rooted + world.target 清空），雪花随之在施法者周围落下。
 *  2) 交接——施法者趁这片安静抽身退开，把冷场留在原地；身上挂上 cold_reception 身份，表示这次出场已经交出去。
 *  3) 雪停——留下的雪区到期散去（field 到期）。
 *
 * 提交前只播预告；雪区（WorldEffects.detachedField，挂在自持 body 上）与退开都在提交后写。有合法后备时由
 * 共享队伍操作收回当前个体、让后备在抽身落点登场；召回不会带走留在原地的雪。
 */
namespace PokemonSkills {
    /** 趁冷场背离最近的敌人退开；找不到敌人就原地不动。 */
    function chillyBow(world: CombatWorld, actor: CombatActor, point: CombatPoint, distance: number): boolean {
        if (!(distance > 0)) return false;
        const actors = world.query(point, 24, false);
        let found = false, nearest = 0, awayX = 0, awayZ = 0;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.ref()) === String(actor.ref()) || world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null) continue;
            const dx = facts.position().x() - point.x(), dz = facts.position().z() - point.z();
            const square = dx * dx + dz * dz;
            if (!found || square < nearest) { found = true; nearest = square; awayX = dx; awayZ = dz; }
        }
        if (!found) return false;
        const length = Math.sqrt(awayX * awayX + awayZ * awayZ);
        const direction = length < 0.01 ? WorldCombat.point(1, 0, 0) : WorldCombat.point(-awayX / length, 0, -awayZ / length);
        const body = world.observe(actor);
        if (body === null) return false;
        const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
        const step = direction.scale(distance);
        if (world.teleport(actor, feet.plus(step))) return true;
        return world.displace(actor, step) > 0;
    }

    define({
        freeMovement: true,
        id: "chillyreception",
        name: "冷笑话",
        description: "抛出一句冷笑话，打断并定住身边一圈的敌人、让他们暂时失去目标，同时在原地留下会持续一段时间的雪区，自己趁势抽身退开；有后备时直接与待命的一只换手。",
        uses: ["被围住时开一条退路", "同时打断并定住身边几个敌人", "退场前顺手把雪留在原地"],
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
            action.present("world_combat:move_chillyreception:windup", chillyScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", radius: p("chillyreception", "silenceRadius", action), punchline: config && config.punchline ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const point = body.position();
            const silenceRadius = p("chillyreception", "silenceRadius", action);
            const pause = Math.max(4, Math.round(p("chillyreception", "pauseTicks", action)));
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
                MobEffects.apply(world, other, chillySilence, hush, 0);
                WorldEffects.apply(world, other, "rooted", {}, pause);
                world.interrupt(other, "world_combat:cold_silence");
                world.target(other, null);
                WorldFeedback.emit(world, chillyScene, 1, facts.position(),
                    { moment: "silence", target: String(other.ref()), pause: pause, scale: silenceRadius / 7 }, 24);
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1, 0)), chillyHushText, [], 24);
                hushed++;
            }
            // 雪区挂在自持的临时 body 上：施法者被换下/收回后雪仍留在原地。
            WorldEffects.detachedField(world, chillyField, point, snowRadius, { density: density, hush: hush }, snowTicks);
            WorldFeedback.emit(world, chillyScene, 1, point,
                { moment: "burst", radius: silenceRadius, scale: silenceRadius / 7, density: density, hushed: hushed, snowTicks: snowTicks }, 44);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), chillyJokeText, [hushed], 30);
            const escaped = chillyBow(world, actor, point, withdraw);
            MobEffects.apply(world, actor, chillySnow, Math.max(40, hush), 0);
            WorldFeedback.emit(world, chillyScene, 1, point,
                { moment: "bow", radius: withdraw, scale: silenceRadius / 7, escaped: escaped ? 1 : 0 }, 26);
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.4, 0)), chillyBowText, [], 26);
            world.sound("cobblemon:move.powdersnow.actor", point, 24, "{}");
            // 有合法后备时真正换手：收回自己、让后备在抽身后的落点登场。
            const reserve = partyReserve(partyRoster(world, actor), partyActiveId(world, actor));
            if (reserve !== null) {
                const stand = world.observe(actor);
                const at = stand === null ? point : stand.position();
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), chillySwitchText, [], 26);
                partySwitchOut(world, actor, reserve.slot, stand === null ? point : partyFeet(stand));
            }
            done(action);
        }
    });
}
