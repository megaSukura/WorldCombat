/**
 * 铁尾 / irontail 的出手方式。
 *
 * 核心念头：转身把沉甸甸的钢尾抡到头顶，沿一条锁定的线狠狠砸在**选定的地面落点**上——力大、范围清晰，但抬尾的
 * 动静看得见，对手有时间退出落点。命中 75 就是这段预告：砸不中不是因为瞄偏，而是因为人已经走开。
 *
 * 三幕：
 *   起（charge／tip，提交前 + 抬尾期）：尾巴抡起、尾端在锁定落点上方的预告高处蓄起钢光，沿尾端到落点画出即将砸落的路径与落点圈。
 *   落（fall）：提交后略一停顿，尾端由高点向已锁点压落。
 *   击（slam）：落点圈内的敌人挨一记重击并被顶开，按几率把护甲砸陷（降防）并挂上砸凹标记。
 *       落点圈里没人就是砸空（miss），只留一地碎屑；被墙挡住时落在真实接触表面。
 *       落点在抬尾时锁定：施法者被推离到够不到它时这一砸取消，绝不静默把圈挪到身边。
 *
 * 选取为 point：可点选可达落点，超过尾长拒绝；方块不自动破坏。
 * 与同族分开：碎岩是贴脸连点的快拳，撕裂爪是一记交叉撕甲，暗影之骨是远程骨投；铁尾是慢而重、能被走位躲开的
 * 钢铁下砸。共享身份 world_combat:status/guardbroken 由 startup.ts 声明。
 */
namespace PokemonSkills {
    const irontailScene = "world_combat:move_irontail";
    const irontailMark = "world_combat:irontail_dented";
    const irontailDentText = "world_combat.move.irontail.text.dent";
    const irontailMissText = "world_combat.move.irontail.text.miss";
    /** 抬尾期锁定的落点与尾端蓄起高度；提交后只按它砸，不追人也不因自身位移静默移圈。 */
    const irontailLock = "world_combat:irontail/locked";

    define({
        id: "irontail",
        name: "Iron Tail",
        description: "先把钢尾抡起、沿一条锁定的线亮出预告，再重砸到落点：圈内目标挨一记重击并被顶开，砸实了可能把护甲砸陷、防御下降一级或更深；最重也最慢，对手可以走出落点躲开。",
        uses: ["把抬尾的预告做成压力", "一记重砸把目标连同落点一起砸开", "对硬目标砸出更深的凹陷"],
        kind: "point",
        range: 3.8,
        maxRange: 5.8,
        prepare: 12,
        active: 20,
        recover: 12,
        cooldown: 44,
        style: "slam",
        defaults: { ai: { maxChase: 9, heavyFirst: true, pinned: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("irontail", "impactRadius", pokemon), geometry: "area", style: "slam", color: 0x9FB0C0, label: "铁尾" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["irontail"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("irontail", "charge", context))),
                recover: p("irontail", "recover", context),
                cooldown: p("irontail", "cooldown", context),
                range: Math.max(3.8, p("irontail", "tailReach", context) + 0.6)
            };
        },
        ready: function (action) {
            const selected = action.targetPosition();
            if (selected.minus(action.origin()).length() > p("irontail", "tailReach", action) + 0.6) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            const origin = action.origin();
            const tail = p("irontail", "tailReach", action);
            const radius = p("irontail", "impactRadius", action);
            const chosen = action.targetPosition(), delta = chosen.minus(origin), dist = delta.length();
            // 预告就贴着真正能砸到的地方：超过尾长的点只画到尾尖可及处，并把这一个点锁定下来。
            const point = dist > tail && dist > 0.01 ? origin.plus(delta.unit().scale(tail)) : chosen;
            // 尾端蓄在落点上方：真实 drop 由这个高点向已锁点压落。
            const rise = Math.max(1.6, tail * 0.7 + radius);
            const tip = point.plus(WorldCombat.point(0, rise, 0));
            action.data(irontailLock, JSON.stringify({ x: point.x(), y: point.y(), z: point.z(), rise: rise }));
            action.present("world_combat:move_irontail:charge", irontailScene, 1, point,
                JSON.stringify({ moment: "charge", windup: prepare,
                    point: [point.x(), point.y(), point.z()], tip: [tip.x(), tip.y(), tip.z()], radius: radius,
                    path: [[tip.x(), tip.y(), tip.z()], [point.x(), point.y(), point.z()]],
                    direction: [action.direction().x(), action.direction().y(), action.direction().z()] }));
            action.present("world_combat:move_irontail:tip", irontailScene, 1, tip,
                JSON.stringify({ moment: "tip", radius: radius, rise: rise }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            // 提交时读取抬尾期锁定的落点：之后不追任何已经离开的人，也不因自身位移静默移圈。
            const stored = action.data(irontailLock);
            const lockedRaw: any = stored !== null ? JSON.parse(stored) : null;
            const power = p("irontail", "slam", action);
            const radius = p("irontail", "impactRadius", action);
            const chance = p("irontail", "dentChance", action);
            const stages = Math.max(1, Math.round(p("irontail", "dentStages", action)));
            const markTicks = Math.max(40, Math.round(p("irontail", "dentTicks", action)));
            const push = p("irontail", "push", action);
            const notes = Math.max(14, Math.round(power * 1.4));
            const scale = radius / 1.2;
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.ravager.step");

            action.after(2, function (drop: CombatAction) {
                const world = drop.world();
                const self = world.observe(actor);
                const here = self !== null ? self.position() : drop.origin();
                const locked = lockedRaw !== null
                    ? WorldCombat.point(lockedRaw.x, lockedRaw.y, lockedRaw.z)
                    : drop.targetPosition();
                const tail = p("irontail", "tailReach", drop);
                // 施法者被移出触达：明确取消这一砸，绝不把落点挪到身边。
                if (locked.minus(here).length() > tail + 0.6) {
                    WorldFeedback.text(world, locked.plus(WorldCombat.point(0, 1.0, 0)), irontailMissText, [], 26);
                    WorldFeedback.emit(world, irontailScene, 1, locked, { moment: "miss", scale: scale, radius: radius }, 22);
                    finish(drop);
                    return;
                }
                // 落点固定为锁定值；只有真被墙挡住时才落在接触表面，绝不因自身位移移圈。
                let at = locked, face = "", cell: CombatPoint | null = null;
                const from = here.plus(WorldCombat.point(0, 0.6, 0)), to = at.plus(WorldCombat.point(0, 0.6, 0));
                if (!world.clear(from, to)) {
                    const probe = drop.trace(from, to, Math.max(0.2, radius * 0.6));
                    if (probe.hitEntity() && probe.target() !== null) at = probe.position();
                    else if (probe.blocked()) {
                        cell = probe.blockPosition();
                        at = cell !== null ? cell : probe.position();
                        face = probe.blockFace();
                    }
                }
                // 尾端在落点上方蓄起，真实 drop 沿 tip -> 已锁点这条线压落。
                const rise = lockedRaw !== null && typeof lockedRaw.rise === "number"
                    ? lockedRaw.rise : Math.max(1.6, tail * 0.7 + radius);
                const tip = at.plus(WorldCombat.point(0, rise, 0));
                const fall = at.minus(tip), fallSpan = fall.length();
                const fallDir = fallSpan > 0.01 ? fall.unit() : WorldCombat.point(0, -1, 0);
                WorldFeedback.emit(world, irontailScene, 1, tip,
                    { moment: "fall", span: fallSpan, notes: notes, scale: scale, radius: radius,
                        direction: [fallDir.x(), fallDir.y(), fallDir.z()] }, 24);
                const region = WorldGeometry.ring(at, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                    // 尾尖到目标这条线要真能通：被墙挡住的不吃这一砸。
                    if (!world.clear(here, facts.position())) return;
                    const landed = hurt(drop, victim, "irontail", power, { damage: damageSpec("irontail", "slam"), contact: true });
                    if (!landed) return;
                    hits++;
                    const away = facts.position().minus(at);
                    if (world.valid(victim) && away.length() >= 0.05) world.hitDisplace(victim, away.unit().scale(push));
                    if (!world.valid(victim) || world.random() >= chance) return;
                    // 护甲真的被砸陷（未被免疫）才留凹陷与标记。
                    if (NativeEffects.boost(world, victim, "def", -stages) === 0) return;
                    if (MobEffects.apply(world, victim, irontailMark, markTicks, 0) === null) return;
                    const body = world.observe(victim);
                    if (body === null) return;
                    WorldFeedback.emit(world, irontailScene, 1, body.position(),
                        { moment: "dent", target: String(victim.ref()), stages: stages, scale: 1 }, 26);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), irontailDentText, [stages], 30);
                    world.sound("cobblemon:impact.steel", body.position(), 14, "{}");
                });
                WorldFeedback.emit(world, irontailScene, 1, at,
                    { moment: "slam", hits: hits, notes: notes, scale: scale, radius: radius, face: face,
                        block: cell !== null ? [cell.x(), cell.y(), cell.z()] : undefined,
                        path: [[tip.x(), tip.y(), tip.z()], [at.x(), at.y(), at.z()]],
                        direction: [fallDir.x(), fallDir.y(), fallDir.z()] }, 30);
                sound(drop, "cobblemon:impact.steel");
                sound(drop, "minecraft:block.anvil.land");
                if (hits === 0) {
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), irontailMissText, [], 26);
                    WorldFeedback.emit(world, irontailScene, 1, at, { moment: "miss", scale: scale, radius: radius }, 22);
                }
                finish(drop);
            });
        }
    });
}
