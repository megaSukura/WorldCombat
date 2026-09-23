/**
 * 铠农炮 / armorcannon 的出手方式。
 *
 * 核心念头：**把烧红的铠甲拆成一副火壳射出去**——在远距离把身上的护甲当炮弹打出去，命中炸开一团火，落点留下焦痕。
 *   它是全族里唯一的特殊招式、唯一不接触、唯一在远处发动的一记；弃守的根据也最直白：铠甲已经烧成了炮弹，
 *   防御与特防自然下降——在提交那一刻付。
 *
 * 三幕（提交前只播预告）：
 *   起（ready）：身上腾起火星、铠甲在胸前烧红收拢，只播预告（`windup`），此时代价未结清。
 *   射（guard → travel → burst）：提交后立刻弃守（自身防御 −guardLoss、特防 −poiseLoss 写进公共能力阶梯，中与不中都照付），
 *       在身前凝成一副火壳沿准线射出；命中活物结算一记 `shell` 特殊伤害，散爆式还炸开 `blast` 半径的火团、外圈敌人各吃 `share`；
 *       落点烧出 `scorch` 半径、`scorchTicks` 时长的焦地（terrain 租借，linger，到期原方块回来）。
 *   散（slump / fizzle）：后坐卸掉、铠甲缺口露出来，身上浮起余烟并浮字提示降级；撞墙或飞完只留一下散火。
 *
 * 与同族分开：近身战贴脸连打、突飞猛扑贴地冲、画龙点睛从天而降；与加农光炮比：光炮是钢属性光矛、贯穿一条线、
 *   压低目标特防；铠农炮是火属性单发、命中炸开火团、灼烧地面，代价落在自己身上。
 *
 * 配置 `burst`（散爆式）由 `resolve` 改时序、由公式改威力／半径／保留，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const armorcannonScene = "world_combat:move_armorcannon";
    const armorcannonSlumpText = "world_combat.move.armorcannon.text.slump";
    const armorcannonBurstText = "world_combat.move.armorcannon.text.burst";

    /** 落点烧出的焦地：以 centre 为心铺黑石；租借，`linger` 活过招式，到期原方块回来。 */
    function armorcannonScorch(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -4; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = distance <= radius * 0.5 ? "minecraft:blackstone" : "minecraft:polished_blackstone";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: armorcannonId,
        cooldownParameter: "recharge",
        name: "Armor Cannon",
        description: "把熊熊燃烧的铠甲做成一副火壳射出去：远距特殊炮击，命中或落地会在落点烧出焦地。开炮时自身防御与特防各下降一级，命中与否都要付。散爆式命中炸开一团火、波及落点周围的人，代价是单发威力更低。",
        uses: ["远距离用一发烧甲炮弹点掉一个目标", "散爆式炸开落点周围挤在一起的敌人", "在远处打一发再退开、把焦地留在场上"],
        kind: "enemy",
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
            action.present("world_combat:move_armorcannon:ready", armorcannonScene, 1, action.origin(),
                JSON.stringify({ moment: "ready", burst: config && config.burst === true ? 1 : 0,
                    plates: Math.round(p(armorcannonId, "plates", action)) }));
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
            const up = WorldCombat.point(0, 1.35, 0);
            let settled = false;

            // 铠甲烧成炮弹：弃守在提交那一刻付。
            NativeEffects.boost(world, actor, "def", -guardLoss);
            NativeEffects.boost(world, actor, "spd", -poiseLoss);
            WorldFeedback.emit(world, armorcannonScene, 1, origin,
                { moment: "guard", guardLoss: guardLoss, poiseLoss: poiseLoss, burst: burst ? 1 : 0, plates: plates, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:move.fireblast.actor");

            function conclude(current: CombatAction, at: CombatPoint, landed: boolean, extra: number, cells: number, moment: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, armorcannonScene, 1, at,
                    { moment: moment, target: targetRef, landed: landed ? 1 : 0, extra: extra, blast: blast, cells: cells,
                        plates: plates, scale: scale, intensity: intensity }, moment === "burst" ? 30 : 20);
                if (moment === "burst") {
                    sound(current, "cobblemon:impact.fire");
                    sound(current, "minecraft:entity.generic.explode");
                    if (extra > 0) WorldFeedback.text(scope, at.plus(up), armorcannonBurstText, [extra], 24);
                }
                const self = scope.observe(actor);
                if (self !== null) {
                    WorldFeedback.emit(scope, armorcannonScene, 1, self.position(),
                        { moment: "slump", guardLoss: guardLoss, poiseLoss: poiseLoss, plates: plates, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(scope, self.position().plus(up), armorcannonSlumpText, [guardLoss, poiseLoss], 28);
                    sound(current, "cobblemon:move.flamecharge.target");
                }
                done(current);
            }

            const lifetime = Math.max(30, Math.round(action.range() / velocity + 30));
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, gravity: 0,
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
                    const cells = armorcannonScorch(scope, at, scorch, scorchTicks);
                    if (burst && blast > 0) {
                        WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, blast, { below: 2.0, above: 3.0 }),
                            function (other, facts) {
                                if (victim !== null && String(other.ref()) === String(victim.ref())) return;
                                if (hurt(current, other, armorcannonId, shell * share, { damage: damageSpec(armorcannonId, "shell") })) extra++;
                            });
                    }
                    conclude(current, at, landed, extra, cells, "burst");
                }
            }, function (current: CombatAction) {
                conclude(current, current.targetPosition(), false, 0, 0, "fizzle");
            });

            WorldFeedback.keep(world, "armorcannon:travel:" + action.id(), armorcannonScene, 1, origin,
                { moment: "travel", projectile: flight, plates: plates, scale: scale, intensity: intensity }, lifetime + 10);
        }
    });
}
