/**
 * 连环巴掌 / doubleslap 的出手方式。
 *
 * 核心念头：**贴身左右开弓**——施法者贴住对手不挪步，一只手掌接一只手掌地来回抽，每一掌把对手朝对侧拨一点，
 *   掌印在两颊之间来回跳。它是本族射程最短的一串：不把人推走，只把人拨得站不稳，所以对手要么硬吃整串，
 *   要么必须在起手时退出贴身距离。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体，也可以只给一个方向起手。提交那刻锁死身体朝向，第一拍在这条朝向的
 *   某一侧掌扇里取最近的首敌，之后每一拍只维持这个首敌；它被拨出当前掌扇、倒下或离开，这一串就收手（空掌断串）。
 *   命中权限仍由命中层按敌我结算；抗推的目标照常吃掌伤，但不会被硬生生挪回中线。
 *
 * 幕：
 *   起（raise，提交前）：抬掌、掌心聚起一线掌风，只播预告。
 *   抽（swing → hit / miss / away，提交后）：最多 `slaps` 掌。左右掌各自从自己一侧的起点向前短扇里判定，
 *       命中则结算一次 `slap` 接触伤害，并按交叉式把目标朝对侧拨开 `sway` 格（走原生受击位移，抗推者不挪）；
 *       每掌独立掷 `accuracy`，擦空或够不着这串就停。
 *   收（settle）：抽完（或掌数用尽、目标先倒、被拨出掌扇）收势，浮字报出这一串抽了几掌。
 *
 * 与同族分开：连续拳是双拳朝固定拳道密集直击、每拳更重；猛推是双掌一路把人推向墙；投球在远处抛球。
 *   只有连环巴掌是**贴身横向来回拨**——反制方式是起手时退出贴身距离，或趁拨动的空当绕到侧面。
 *
 * 配置 `cross`（交叉式）由公式改威力／掌数／拨动／间距；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 水平侧向单位向量：掌击朝哪一侧拨；朝向接近竖直时退化为世界 X 轴。 */
    function doubleslapSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: doubleslapId,
        cooldownParameter: "recharge",
        name: "Double Slap",
        description: "贴身左右开弓：一只手掌接一只手掌地来回抽打，每一掌把对手朝对侧拨一点。第一拍锁死朝向并只维持同一个近敌，被拨出掌扇就中断；可以点敌人，也可以只给一个方向起手。交叉式多而轻、把人拨得更晃；直抽式少而重、抽得更狠。",
        uses: ["贴身一串快速的小掌击", "对低防目标靠掌数堆伤害", "交叉式把对手拨得左右晃，打断它的站位", "只朝一个方向起手，空掌就收招"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.2,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        maximumTicks: 220,
        style: "palm",
        defaults: { cross: false, ai: { maxChase: 4, steady: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[doubleslapId], detail: { values: config } };
            return { radius: p(doubleslapId, "reach", context), geometry: "circle", style: "palm", color: 0xF6C9D2,
                label: config && config.cross === true ? "连环巴掌·交叉式" : "连环巴掌·直抽式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[doubleslapId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(doubleslapId, "tempo", context)),
                recover: Math.round(p(doubleslapId, "settle", context)),
                cooldown: Math.round(p(doubleslapId, "recharge", context)),
                active: 0,
                range: p(doubleslapId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const slaps = Math.max(2, Math.min(5, Math.round(p(doubleslapId, "slaps", action))));
            const smack = Math.max(8, Math.round(p(doubleslapId, "smack", action)));
            action.present("doubleslap:raise:" + action.id(), doubleslapScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", slaps: slaps, smack: smack, windup: prepare,
                    cross: config && config.cross === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const power = p(doubleslapId, "slap", action);
            const slaps = Math.max(2, Math.min(5, Math.round(p(doubleslapId, "slaps", action))));
            const gap = Math.max(2, Math.round(p(doubleslapId, "gap", action)));
            const reach = p(doubleslapId, "reach", action);
            const sway = Math.max(0, p(doubleslapId, "sway", action));
            const accuracy = Math.max(0.05, Math.min(0.99, p(doubleslapId, "accuracy", action)));
            const smack = Math.max(8, Math.round(p(doubleslapId, "smack", action)));
            const cross = !!(config && config.cross === true);
            const band = { below: 1.0, above: 2.2 };
            const scale = Math.max(0.6, Math.min(1.6, reach / 2.4));
            const intensity = Math.max(0.5, Math.min(2.2, power / 16));
            // 提交那刻锁死朝向：整串不随目标转身，只在这条朝向的左右掌短扇里找首敌。
            const heading = WorldGeometry.flatUnit(NativeSemantics.aim(action, move,
                WorldGeometry.flatUnit(action.targetPosition().minus(action.origin()), action.direction()), 1.3));
            const locked = action.target();
            const lockedRef = locked !== null && world.valid(locked) && !world.friendly(locked) ? String(locked.ref()) : "";
            let index = 0, landed = 0, targetRef = "", settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 这一串收势：报出抽中了几掌。 */
            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, doubleslapScene, 1, at,
                    { moment: "settle", slaps: slaps, landed: landed, smack: smack, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), doubleslapTallyText, [landed], 22);
                finish(current);
            }

            function slap(current: CombatAction): void {
                if (settled) return;
                if (index >= slaps) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { settle(current); return; }
                const origin = self.position();
                const side = doubleslapSide(heading);
                const sign = index % 2 === 0 ? 1 : -1;
                const palmOffset = Math.max(0.15, Math.min(0.45, self.width() * 0.5));
                const palm = origin.plus(side.scale(sign * palmOffset));
                const fan = Math.max(30, Math.min(80, 40 + self.width() * 24));
                const fanReach = reach + 0.6;
                const shot = index + 1;
                let victim: CombatActor | null = null;
                // 第一拍优先用被指到的近敌；后续每一拍只维持已经抽中的那个首敌。
                if (index === 0 && lockedRef !== "") {
                    const candidate = scope.actor(lockedRef);
                    const body = candidate !== null && scope.valid(candidate) && !scope.friendly(candidate) ? scope.observe(candidate) : null;
                    if (body !== null && palm.minus(body.position()).length() <= fanReach) victim = candidate;
                } else if (targetRef !== "") {
                    const candidate = scope.actor(targetRef);
                    if (candidate !== null && scope.valid(candidate) && !scope.friendly(candidate)) victim = candidate;
                }
                if (victim === null && targetRef === "") {
                    // 第一拍：在这只掌的短扇里取最近的首敌。
                    WorldGeometry.selectEnemies(scope, WorldGeometry.sector(palm, heading, fanReach, fan, band), function (other) {
                        if (victim !== null) return;
                        victim = other;
                    });
                }
                if (victim === null) {
                    // 空掌：没有够得着的首敌，这一串到此为止。
                    WorldFeedback.emit(scope, doubleslapScene, 1, palm.plus(heading.scale(reach)),
                        { moment: "away", index: shot, slaps: slaps, smack: smack, reach: Math.round(reach * 100) / 100,
                            scale: scale, direction: [heading.x(), heading.y(), heading.z()] }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), doubleslapEmptyText, [], 20);
                    settle(current);
                    return;
                }
                const victimRef = String(victim.ref());
                const body = scope.observe(victim);
                if (body === null) { settle(current); return; }
                // 被前一掌拨出这只掌的短扇：够不着，这一串收手。
                const toBody = body.position().minus(palm);
                const flat = WorldGeometry.flatUnit(toBody, heading);
                const withinFan = toBody.length() <= fanReach &&
                    WorldGeometry.dot(flat, heading) >= Math.cos(Math.min(80, fan) * Math.PI / 360) - 1e-9;
                if (!withinFan) {
                    WorldFeedback.emit(scope, doubleslapScene, 1, palm.plus(flat.scale(Math.min(reach, toBody.length()))),
                        { moment: "away", target: victimRef, index: shot, slaps: slaps, smack: smack,
                            reach: Math.round(reach * 100) / 100, scale: scale, direction: [flat.x(), flat.y(), flat.z()] }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), doubleslapAwayText, [landed], 20);
                    settle(current);
                    return;
                }
                const contact = scope.closestPoint(victim, palm);
                const facing = WorldGeometry.flatUnit(body.position().minus(origin), heading);
                // 掌影从这只掌的真实起点朝目标扇出；左右交替由 sign 决定。
                WorldFeedback.emit(scope, doubleslapScene, 1, palm,
                    { moment: "swing", target: victimRef, point: [palm.x(), palm.y(), palm.z()],
                        direction: [facing.x(), facing.y(), facing.z()], index: shot, slaps: slaps, side: sign, tilt: sign * 34,
                        smack: smack, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 18);
                sound(current, "minecraft:entity.player.attack.weak");
                // 命中 85：共享偏角让这一掌真的会歪。
                if (scope.random() > accuracy) {
                    WorldFeedback.emit(scope, doubleslapScene, 1, contact,
                        { moment: "miss", target: victimRef, index: shot, slaps: slaps, side: sign, smack: smack,
                            scale: scale }, 16);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), doubleslapMissText, [shot], 18);
                    settle(current);
                    return;
                }
                if (!hurt(current, victim, doubleslapId, power, { damage: damageSpec(doubleslapId, "slap"), contact: true })) {
                    settle(current);
                    return;
                }
                landed++;
                index = shot;
                targetRef = victimRef;
                // 横向拨动走原生受击位移：抗推的 Boss 照常吃掌伤，但不会被硬挪回中线。
                if (sway > 0.01 && scope.valid(victim)) scope.hitDisplace(victim, side.scale(sway * sign));
                WorldFeedback.emit(scope, doubleslapScene, 1, contact,
                    { moment: "hit", target: victimRef, point: [contact.x(), contact.y(), contact.z()], index: shot, slaps: slaps,
                        side: sign, sway: Math.round(sway * 100) / 100, smack: smack, scale: scale,
                        intensity: intensity, cross: cross ? 1 : 0 }, 20);
                scope.sound("cobblemon:impact.normal", contact, 14, "{}");
                if (index >= slaps) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { slap(next); });
            }

            sound(action, "minecraft:entity.player.attack.weak");
            WorldFeedback.emit(world, doubleslapScene, 1, action.origin(),
                { moment: "raise", slaps: slaps, smack: smack, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 16);
            slap(action);
        }
    });
}
