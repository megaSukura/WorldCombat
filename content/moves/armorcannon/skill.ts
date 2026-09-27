/**
 * 铠农炮 / armorcannon 的出手方式。
 *
 * 核心念头：**把烧红的铠甲拆成一副火壳射出去**——在远距离把身上的护甲当炮弹打出去，命中炸开一团火。
 *   它是全族里唯一的特殊招式、唯一不接触、唯一在远处发动的一记；弃守的根据也最直白：铠甲已经烧成了炮弹，
 *   防御与特防自然下降——在提交那一刻付。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：身上腾起火星、铠甲在胸前烧红收拢，只播预告（`windup`），此时代价未结清；预备光画在真实炮口点。
 *   射（guard → travel → burst）：提交后立刻弃守（自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯，中与不中都照付），
 *       在身前炮口点凝成一副火壳沿准线射出；命中活物结算一记 `shell` 特殊伤害，散爆式还从真实接触面向 `blast` 半径内
 *       可达的敌人各分 `share`（隔墙不算），并按实际 `blast` 画一次短扩散；单发式只有局部壳碎。
 *       命中或撞块都在真落点结算这一发，并在落点散出 `scorch` 半径、`scorchTicks` 时长的短促热壳残屑（纯表现，不改动方块、不持续灼烧）。
 *   散（slump / fizzle）：后坐卸掉、铠甲缺口露出余烟；空飞散火落在实际最后弹体点。实际双防降幅在提交当刻就浮字。
 *
 * 选取 `kind: "aim"`：自由瞄向发炮，方向或世界点都行；地形会触发这一发，空飞耗尽不再额外生地形。
 *
 * 与同族分开：近身战贴脸连打、突飞猛扑贴地冲、画龙点睛从天而降；与加农光炮比：光炮是钢属性光矛、贯穿一条线、
 *   压低目标特防；铠农炮是火属性单发、命中炸开火团、散出短暂热屑，代价落在自己身上。
 *
 * 配置 `burst`（散爆式）由 `resolve` 改时序、由公式改威力／半径／保留，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const armorcannonScene = "world_combat:move_armorcannon";
    const armorcannonSlumpText = "world_combat.move.armorcannon.text.slump";
    const armorcannonBurstText = "world_combat.move.armorcannon.text.burst";

    /**
     * 真实炮口点：本体中心沿准线前移一个身位，但被首个 BLOCK 挡住时就落在障碍表面——预备光与火壳离手共用它，
     * 本体→炮口不可达时不越墙生成。读作用域传 `action.sense()`（预备）或 `action.world()`（发射）。
     */
    function armorcannonMuzzle(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, body: CombatObservation | null): CombatPoint {
        const reach = body === null ? 0.6 : Math.max(0.5, body.width() * 0.5 + 0.2);
        const desired = origin.plus(heading.scale(reach));
        const wall = WorldGeometry.blockHit(world, origin, desired);
        return wall === null ? desired : wall.position();
    }

    define({
        id: armorcannonId,
        cooldownParameter: "recharge",
        name: "Armor Cannon",
        description: "把熊熊燃烧的铠甲做成一副火壳射出去：远距特殊炮击，命中活物或撞上障碍都在真落点炸开，散出一圈短促的热壳残屑（只是表现，不改动地面）。开炮时自身防御与特防各下降一级，命中与否都要付。散爆式命中炸开一团火、波及落点周围可达的人，代价是单发威力更低。",
        uses: ["远距离用一发烧甲炮弹点掉一个目标", "散爆式炸开落点周围挤在一起的敌人", "接受开炮即掉双防的代价，换一发高伤单点"],
        kind: "aim",
        range: 11,
        maxRange: 17,
        prepare: 12,
        active: 0,
        recover: 12,
        cooldown: 38,
        maximumTicks: 240,
        style: "cannon",
        defaults: { burst: false, ai: { maxChase: 16, standoff: 5, finish: true, minHealth: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(armorcannonId, "reach", pokemon) : 11, geometry: "line", style: "cannon",
                color: 0xFF8C3A, label: config && config.burst === true ? "铠农炮·散爆式" : "铠农炮·单发式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[armorcannonId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const burst = !!(config && config.burst);
            return {
                prepare: Math.round(p(armorcannonId, "tempo", context)),
                recover: Math.round(p(armorcannonId, "aftercast", context)) + (burst ? 3 : 0),
                cooldown: Math.round(p(armorcannonId, "recharge", context)),
                active: 0,
                range: p(armorcannonId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 预备光画在真实炮口点：与提交后火壳离手共用同一约束，贴墙时不画到墙里。
            const heading = aim(action);
            const sense = action.sense();
            const body = sense.observe(action.actor());
            const muzzle = armorcannonMuzzle(sense, action.origin(), heading, body);
            action.present("world_combat:move_armorcannon:ready", armorcannonScene, 1, muzzle,
                JSON.stringify({ moment: "ready", burst: config && config.burst === true ? 1 : 0,
                    plates: Math.round(p(armorcannonId, "plates", action)),
                    scale: Math.max(0.6, Math.min(2.2, p(armorcannonId, "scorch", action) / 1.4)),
                    direction: [heading.x(), heading.y(), heading.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const shell = p(armorcannonId, "shell", action);
            const velocity = Math.max(0.3, p(armorcannonId, "velocity", action));
            const radius = p(armorcannonId, "radius", action);
            const burst = !!(config && config.burst);
            const blast = p(armorcannonId, "blast", action);
            const share = p(armorcannonId, "share", action);
            const scorch = p(armorcannonId, "scorch", action);
            const scorchTicks = p(armorcannonId, "scorchTicks", action);
            const plates = Math.round(p(armorcannonId, "plates", action));
            const guardLoss = Math.max(0, Math.round(p(armorcannonId, "guardLoss", action)));
            const poiseLoss = Math.max(0, Math.round(p(armorcannonId, "poiseLoss", action)));
            const target = action.target();
            const targetRef = target !== null ? String(target.ref()) : "";
            const scale = Math.max(0.6, Math.min(2.2, scorch / 1.4));
            const intensity = Math.max(0.5, Math.min(2.4, shell / 110));
            // 真实炮口点：预备光与火壳起点都用它，被墙挡住就落在首障碍表面；护甲崩片仍留在身体上。
            const heading = aim(action);
            const body = world.observe(actor);
            const muzzle = armorcannonMuzzle(world, origin, heading, body);
            const up = WorldCombat.point(0, 1.35, 0);
            let settled = false;

            // 铠甲烧成炮弹：弃守在提交那一刻付，反馈只报实际降下的量。
            const guardDrop = Math.abs(NativeEffects.boost(world, actor, "def", -guardLoss));
            const poiseDrop = Math.abs(NativeEffects.boost(world, actor, "spd", -poiseLoss));
            const spent = guardDrop + poiseDrop;
            WorldFeedback.emit(world, armorcannonScene, 1, origin,
                { moment: "guard", guardLoss: guardDrop, poiseLoss: poiseDrop, shed: spent > 0 ? plates : 0,
                    burst: burst ? 1 : 0, plates: plates, scale: scale, intensity: intensity }, 24);
            // 提交当刻就报实际双防变化；原生拒绝（降幅 0）时不浮字。
            if (spent > 0) WorldFeedback.text(world, origin.plus(up), armorcannonSlumpText, [guardDrop, poiseDrop], 28);
            sound(action, "cobblemon:move.fireblast.actor");

            function conclude(current: CombatAction, at: CombatPoint | null, landed: boolean, extra: number, moment: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (at !== null) {
                    WorldFeedback.emit(scope, armorcannonScene, 1, at,
                        { moment: moment, target: targetRef, landed: landed ? 1 : 0, extra: extra, blast: blast, burst: burst ? 1 : 0,
                            ring: burst && blast > 0 ? Math.max(6, Math.min(24, Math.round(blast * 8))) : 0,
                            scorch: scorch, plates: plates, scale: scale, intensity: intensity }, moment === "burst" ? 30 : 20);
                    if (moment === "burst") {
                        sound(current, "cobblemon:impact.fire");
                        sound(current, "minecraft:entity.generic.explode");
                        if (extra > 0) WorldFeedback.text(scope, at.plus(up), armorcannonBurstText, [extra], 24);
                        // 短促热壳残屑：命中那一刻迸发一次，余烬自行熄灭，不改动地面方块。
                        WorldFeedback.emit(scope, armorcannonScene, 1, at,
                            { moment: "residue", scorch: scorch, plates: plates, scale: scale, intensity: intensity * 0.6 },
                            Math.max(20, Math.round(scorchTicks)));
                    }
                }
                const self = scope.observe(actor);
                if (self !== null) {
                    // 收尾只留余烟：代价浮字已在提交当刻报过，这里不再重复。
                    WorldFeedback.emit(scope, armorcannonScene, 1, self.position(),
                        { moment: "slump", plates: plates, scale: scale, intensity: intensity }, 26);
                    sound(current, "cobblemon:move.flamecharge.target");
                }
                done(current);
            }

            const lifetime = Math.max(30, Math.round(action.range() / velocity + 30));
            let flight = "";
            flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, gravity: 0, origin: muzzle, direction: heading,
                lifetime: lifetime,
                appearance: { sprite: "cobblemon:generic/burning_rock", tint: 0xFF8C3A, glow: true,
                    scale: Math.max(0.9, Math.min(2.2, radius / 0.3)) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const victim = hit.target();
                    let landed = false, extra = 0;
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        landed = impact(current, hit, armorcannonId, shell, { damage: damageSpec(armorcannonId, "shell") });
                    }
                    const at = hit.position();
                    // 命中或撞块都用同一真实落点结算：散爆式从接触面炸开，只波及真实可达的人。
                    if (burst && blast > 0) {
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, blast, { below: 2.0, above: 3.0 }),
                            function (other, facts) {
                                if (victim !== null && String(other.ref()) === String(victim.ref())) return;
                                if (!scope.clear(at, facts.position())) return;
                                if (hurt(current, other, armorcannonId, shell * share, { damage: damageSpec(armorcannonId, "shell") })) extra++;
                            });
                    }
                    conclude(current, at, landed, extra, "burst");
                }
            }, function (current: CombatAction) {
                // 空飞耗尽：按真实最后弹体点收尾，不生成残屑、不改动地面；读不到末点就不假造满程终点。
                conclude(current, current.world().projectilePosition(flight), false, 0, "fizzle");
            });

            WorldFeedback.keep(world, "armorcannon:travel:" + action.id(), armorcannonScene, 1, muzzle,
                { moment: "travel", projectile: flight, plates: plates, scale: scale, intensity: intensity }, lifetime + 10);
        }
    });
}
