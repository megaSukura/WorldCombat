/**
 * 龙尾 / dragontail —— 注册与动作。
 *
 * 核心念头：从一侧到另一侧用 6 刻甩出一道真实的尾扫弧，尾梢外三分之一砸得最重、内段只是扫开；每个被扫到的人
 *   沿背离方向被当次送飞、抛起，有后备的对手被真正换下。墙会在尾巴当刻停住，墙后的人扫不到。
 * 一幕：
 *   起（windup，提交前）：龙鳞色的尾光在身后拢起、地盘微震，预告这一扫。
 *   扫（execute，提交后）：以施法者为原点、朝瞄准方向，从一侧到另一侧分 6 刻摆尾。每一刻从中心到当刻尾尖做一次
 *       原生 ray：命中方块就把尾扫截断到接触点，墙后的目标扫不到。落在本刻窄扇内、且未越过截断点的非友方各挨
 *       一次：距中心 ≥ reach×tip（尾梢外三分之一）吃满 lash，内段吃 share；每人只算一次。中者沿背离方向被
 *       `hitDisplace` 送飞（读到实际路程，抗位移只吃伤害）、再用 `hitImpulse` 抛起 lift，有合法后备者 `partyForceOut`。
 * 与同族分开：龙尾是一次真实摆尾的正面扇形横扫，能一次扫中多人；巴投是抓一个摔到背后；吼叫绕身一圈无伤；
 *   吹飞是一条向前推进、会被墙截断的风道。
 */
namespace PokemonSkills {
    const dragontailSteps = 6;

    /** 单次位移上限 4 格，超出时拆成几步走完；每步读实际路程，撞墙/抗位移即停下。返回实际送出的距离。 */
    function dragontailSend(world: CombatWorld, target: CombatActor, dir: CombatPoint, distance: number): number {
        let remaining = distance, moved = 0;
        for (let guard = 0; guard < 4 && remaining > 0.05; guard++) {
            const leg = Math.min(4, remaining);
            const applied = world.hitDisplace(target, dir.scale(leg));
            moved += applied;
            if (!(applied > 0) || applied < leg - 0.01) break;
            remaining -= leg;
        }
        return moved;
    }

    define({
        id: dragontailId,
        cooldownParameter: "recharge",
        name: "龙尾",
        description: "从一侧到另一侧甩出一道尾扫，把身前一整片扇形里的敌人抽飞：尾梢外三分之一挨满威力、内段只被扫开，每人只挨一次；有后备的对手会被真正换下。墙会在尾巴当刻截住那一段尾扫，挡不住的目标仍吃伤害但送不动。",
        uses: ["当面横扫、把一排敌人一起抽开", "在敌人贴身时把它们扫出近身圈", "对单个厚实目标打一击并送走"],
        kind: "aim",
        range: 3,
        maxRange: 4.5,
        prepare: 10,
        active: 6,
        recover: 8,
        cooldown: 100,
        style: "tail",
        defaults: { high: false, ai: { maxChase: 8, minFoes: 1, leaveStation: false } },
        fields: [flag("high", "高抛")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[dragontailId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(dragontailId, "tempo", context)), recover: Math.round(p(dragontailId, "aftercast", context)),
                cooldown: Math.round(p(dragontailId, "recharge", context)), active: 6, range: p(dragontailId, "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_dragontail:windup", dragontailScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, shards: Math.round(p(dragontailId, "shards", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(dragontailId, "reach", pokemon), geometry: "cone", style: "tail", color: 0x7C5CD8,
                label: config && config.high ? "龙尾·高抛" : "龙尾" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const scenes = WorldFeedback.actionScenes(dragontailScene, 1);
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            if (action.target() !== null) action.releaseTarget();
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            const reach = p(dragontailId, "reach", action), sweep = p(dragontailId, "sweep", action);
            const lash = p(dragontailId, "lash", action);
            const hurl = p(dragontailId, "hurl", action), lift = p(dragontailId, "lift", action);
            const shards = Math.round(p(dragontailId, "shards", action));
            const share = p(dragontailId, "share", action), tip = p(dragontailId, "tip", action);
            const height = body !== null ? body.height() : 1.4, width = body !== null ? body.width() : 0.9;
            const band = { below: Math.max(0.7, height * 0.55), above: Math.max(0.85, height * 0.6) };
            const half = sweep * Math.PI / 360, base = Math.atan2(heading.z(), heading.x());
            const gauge = Math.max(0.18, width * 0.35);
            // 尾巴扫的是身体而不是中心点：按体宽给一点接触余量，尾端擦到身体边缘也算命中。
            const contact = Math.max(0.35, width * 0.5);
            const wedge = Math.max(24, sweep / dragontailSteps * 1.3);
            const scale = Math.max(0.6, Math.min(2.2, reach / 3));
            const struck: { [ref: string]: boolean } = Object.create(null);
            let index = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, function (next: CombatAction) {
                    const scope = next.world(), above = centre.plus(WorldCombat.point(0, 1.3, 0));
                    if (hits === 0) WorldFeedback.emit(scope, dragontailScene, 1, centre, { moment: "miss", scale: scale }, 16);
                    WorldFeedback.text(scope, above, hits > 0 ? dragontailHitText : dragontailMissText, hits > 0 ? [hits] : [], 26);
                    done(next);
                });
            }

            function sweepTick(current: CombatAction): void {
                const scope = current.world();
                const t = dragontailSteps <= 1 ? 0 : index / (dragontailSteps - 1);
                const angle = base - half + 2 * half * t;
                const dir = WorldCombat.point(Math.cos(angle), 0, Math.sin(angle));
                const full = centre.plus(WorldCombat.point(dir.x() * reach, 0, dir.z() * reach));
                // 当刻的尾体从中心伸到尾尖；撞到方块就在接触点截断，墙后的这一段扫不到。
                const probe = current.trace(centre, full, gauge, false);
                const clipped = probe.blockPosition() !== null && !probe.hitEntity();
                const end = clipped ? probe.position() : full;
                const effective = Math.max(0, end.minus(centre).length());
                scenes.show(current, "tail", centre, {
                    moment: "sweep",
                    path: [[centre.x(), centre.y(), centre.z()], [end.x(), end.y(), end.z()]],
                    point: [end.x(), end.y(), end.z()],
                    direction: [dir.x(), 0, dir.z()],
                    reach: reach, effective: effective, clipped: clipped ? 1 : 0,
                    shards: shards, tip: tip, scale: scale
                });
                if (effective > 0.15) WorldGeometry.selectEnemies(scope,
                    WorldGeometry.sector(centre, dir, effective + contact, wedge, band), function (target, facts) {
                    const ref = String(target.ref());
                    if (ref === String(actor.ref()) || struck[ref]) return;
                    const distance = facts.position().minus(centre).length();
                    if (distance > effective + contact) return;
                    struck[ref] = true;
                    const heavy = distance >= reach * tip;
                    const landed = hurt(current, target, dragontailId, lash * (heavy ? 1 : share),
                        { damage: damageSpec(dragontailId, "lash"), contact: true });
                    WorldFeedback.emit(scope, dragontailScene, 1, facts.position(),
                        { moment: "impact", target: ref, shards: Math.round(shards * (heavy ? 0.6 : 0.35)),
                            size: heavy ? 0.4 : 0.26, primary: heavy ? 1 : 0 }, 22);
                    hits++;
                    if (!landed || !scope.valid(target)) return;
                    const away = WorldCombat.point(facts.position().x() - centre.x(), 0, facts.position().z() - centre.z());
                    const pushDir = away.length() < 0.01 ? WorldCombat.point(dir.x(), 0, dir.z()) : away.unit();
                    const moved = dragontailSend(scope, target, pushDir, hurl);
                    // 位移被墙或抗性挡住时只留下短压缩接触，不再补一记虚拟飞出。
                    if (moved > 0.1)
                        scope.hitImpulse(target, WorldCombat.point(pushDir.x(), 0, pushDir.z()).scale(Math.min(2.4, hurl * 0.4))
                            .plus(WorldCombat.point(0, lift, 0)));
                    const after = scope.observe(target);
                    if (after !== null && partyForceOut(scope, target, partyFeet(after)) !== null)
                        WorldFeedback.text(scope, after.position().plus(WorldCombat.point(0, 1.1, 0)), dragontailSwitchText, [], 24);
                });
                index++;
                if (index >= dragontailSteps) { finish(current); return; }
                current.after(1, function (next: CombatAction) { sweepTick(next); });
            }

            sound(action, "cobblemon:move.dragonclaw.actor");
            sweepTick(action);
        }
    });
}
