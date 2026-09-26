/**
 * 绞紧 / wringout 的出手方式。
 *
 * 念头的形状：施法者周身浮起螺旋气、朝目标收拢（coil，提交前只播预告）→ 一束螺旋力沿瞄准方向扫出窄线，
 *   缠住**第一个真正碰到的敌人**、由脚到头拧紧（wring）：命中一记随「目标完整度」结算的 `wring` → 双绞式在
 *   `gap` 刻后再**反向**拧一记（第二拧按目标当时的血量重算、乘 `secondFactor`），第一拧成功不保证第二拧：
 *   目标走出原施放范围、或与施法者之间被实墙隔开，就散圈收场 → 松手，流光散去。
 *
 * 两拧方向相反：第一圈向右收、第二圈向左收，所以看得出一紧一松的反拧。线被墙截住、或没缠到任何敌人就只是拧空，
 *   不结算伤害。速度快的个体两拧接得更紧。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体，也可只给方向或世界点；只有实际被窄线碰到的首个非友方才会被缠上。
 *   攻击许可仍由命中层按敌我结算。提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    const wringoutWringText = "world_combat.move.wringout.text.wring";
    const wringoutTwinText = "world_combat.move.wringout.text.twin";
    const wringoutMissText = "world_combat.move.wringout.text.miss";
    const wringoutBrokenText = "world_combat.move.wringout.text.broken";

    define({
        id: wringoutId,
        cooldownParameter: "recharge",
        name: "Wring Out",
        description: "一束螺旋力沿瞄准方向扫出一条窄线，缠住第一个碰到的敌人并越拧越紧，把它的力气绞出来：特攻决定拧进去多深，对手此刻剩余的生命越满，威力越大。它是三压招里唯一以特攻驱动、也是唯一能绞两段的一记：双绞式在第一拧之后再反向拧一记，第二段按对手当时的血量重算——但对手离开原施放范围或被墙隔开时，第二拧就散了。",
        uses: ["开局对满血的目标绞出最重的一记", "双绞式用反向的第二拧补掉剩下的血量", "用特攻高的个体把整条血拧成伤害"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.5,
        prepare: 8,
        active: 16,
        recover: 7,
        cooldown: 24,
        style: "wring",
        defaults: { twin: false, ai: { maxChase: 6, preferHealthy: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(wringoutId, "reach", pokemon) + 0.2, geometry: "line", style: "wring",
                color: 0x9A7BFF, label: config && config.twin === true ? "绞紧 · 双绞式" : "绞紧 · 单绞式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[wringoutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(wringoutId, "tempo", context)),
                recover: Math.round(p(wringoutId, "aftercast", context)),
                cooldown: Math.round(p(wringoutId, "recharge", context)),
                active: skills[wringoutId].active,
                range: p(wringoutId, "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wringout:coil", wringoutScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", twin: config && config.twin === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const heading = aim(action);
            const reach = Math.max(2.2, p(wringoutId, "reach", action));
            const grip = Math.max(0.25, p(wringoutId, "grip", action));
            const radius = Math.max(0.6, p(wringoutId, "coilRadius", action));
            const coil = Math.max(10, Math.round(p(wringoutId, "coil", action)));
            const motes = Math.max(10, Math.round(p(wringoutId, "motes", action)));
            const scale = radius / wringoutReference;
            const twin = !!(config && config.twin);
            const end = origin.plus(heading.scale(reach));
            let settled = false;

            sound(action, "minecraft:block.beacon.activate");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 没缠到人：只留一团散开的螺旋，不结算任何东西。 */
            function whiff(current: CombatAction, point: CombatPoint, reason: string): void {
                const scope = current.world();
                WorldFeedback.emit(scope, wringoutScene, 1, point,
                    { moment: "whiff", scale: scale, motes: Math.round(motes * 0.7), reason: reason }, 18);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), wringoutMissText, [], 22);
                finish(current);
            }

            // 窄线只缠第一个被碰到的非友方；线撞到实墙就散圈，不建看不见的连接。
            const grab = action.trace(origin, end, grip);
            if (grab.hitEntity()) {
                const candidate = grab.target();
                if (candidate !== null && world.valid(candidate) && !world.friendly(candidate)) {
                    wrench(action, candidate, grab.position());
                    return;
                }
            }
            if (grab.blocked()) {
                const at = grab.position();
                WorldFeedback.emit(world, wringoutScene, 1, at,
                    { moment: "wall", face: grab.blockFace(),
                        path: [[origin.x(), origin.y(), origin.z()], [at.x(), at.y(), at.z()]],
                        scale: scale, motes: Math.round(motes * 0.5) }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), wringoutMissText, [], 22);
                sound(action, "minecraft:block.vine.break");
                finish(action);
                return;
            }
            whiff(action, end, "empty");

            /** 第一拧：读命中当刻的血量作威力环粗细，再结算；成功后才可能接第二拧。 */
            function wrench(current: CombatAction, target: CombatActor, contact: CombatPoint): void {
                const scope = current.world();
                const girth = wringoutGirth(scope, target);
                const power = p(wringoutId, "wring", current);
                if (!hurt(current, target, wringoutId, power,
                    { damage: damageSpec(wringoutId, "wring"), contact: true })) {
                    whiff(current, contact, "resist");
                    return;
                }
                const body = scope.observe(target);
                const at = body === null ? contact : body.position();
                WorldFeedback.emit(scope, wringoutScene, 1, at,
                    { moment: "squeeze", target: String(target.ref()), motes: motes, scale: scale, coil: coil, pulse: 1,
                        girth: girth, intensity: Math.max(0.6, Math.min(2.2, power / 95)) }, Math.max(20, coil + 8));
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), wringoutWringText, [1], 22);
                if (!twin) { finish(current); return; }
                const gap = Math.max(6, Math.round(p(wringoutId, "gap", current)));
                const second = Math.max(0.5, p(wringoutId, "secondFactor", current));
                current.after(gap, function (next: CombatAction) { twistAgain(next, target, second); });
            }

            /** 第二拧：目标还在原施放范围内、且与施法者之间通视才反向再拧一记；否则散圈。 */
            function twistAgain(current: CombatAction, target: CombatActor, second: number): void {
                const scope = current.world();
                if (!scope.valid(target)) { finish(current); return; }
                const held = scope.observe(target), holder = scope.observe(actor);
                if (held === null || holder === null) { finish(current); return; }
                const inRange = origin.minus(held.position()).length() <= reach + 0.6;
                if (!inRange || !scope.clear(holder.position(), held.position())) {
                    WorldFeedback.emit(scope, wringoutScene, 1, held.position(),
                        { moment: "whiff", target: String(target.ref()), scale: scale, motes: Math.round(motes * 0.7),
                            girth: wringoutGirth(scope, target), reason: "sight" }, 18);
                    WorldFeedback.text(scope, held.position().plus(WorldCombat.point(0, 1.2, 0)), wringoutBrokenText, [], 22);
                    finish(current);
                    return;
                }
                // 第二拧按目标此刻的血量重算，完整度系数自然落到「已经挨过一拧」的那个人身上；方向相反。
                const girth = wringoutGirth(scope, target);
                const again = p(wringoutId, "wring", current) * second;
                if (!hurt(current, target, wringoutId, again,
                    { damage: damageSpec(wringoutId, "wring"), contact: true })) { finish(current); return; }
                const now = scope.observe(target);
                const point = now === null ? held.position() : now.position();
                WorldFeedback.emit(scope, wringoutScene, 1, point,
                    { moment: "squeeze2", target: String(target.ref()), motes: Math.round(motes * second),
                        scale: scale, coil: coil, pulse: 2, girth: girth,
                        intensity: Math.max(0.5, Math.min(2.2, again / 95)) }, Math.max(20, coil + 8));
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.25, 0)), wringoutTwinText, [], 22);
                scope.sound("minecraft:block.beacon.activate", point, 14, "{}");
                finish(current);
            }
        }
    });
}
