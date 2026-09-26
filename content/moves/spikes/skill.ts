/**
 * 撒菱 / spikes 的出手方式。
 *
 * 核心念头：把一把尖锐碎片朝选定的地面撒出去，碎片落地插成一圈尖刺留在那里；踏进来的那一下被扎，
 *   之后只有在刺地里真的走出一步才会再被扎——站住不动不会周期掉血，跳起来把中段的刺让在脚下。
 *   它是本组唯一**层数叠加、按步伐结算、只扎同层贴地目标**的伤害陷阱。
 *
 * 三幕：
 *   起（windup，提交前）：掌心拢起碎屑的预告。
 *   撒（toss→lay）：提交后碎片沿低弧线飞出，落点必须吸到真实合法地表才插成半径 patchRadius 的尖刺圈
 *       （`WorldEffects.field`，规则 `world_combat:hazard/spikes` 由本单元注册）；落在水面、岩浆或空中就落空。
 *       同一片同层地上已有的自方尖刺并入新的一层。
 *   扎（tread／step→hum）：尖刺圈存续 patchTicks。贴地的非友方 `enter` 时按层数结算一次 `pierce`（地属性物理）；
 *       之后每名敌人各自累计在圈内实际水平走过的距离，每跨过 `step`（约 0.9 格）再扎一次，并遵守最短
 *       `treadInterval`。跳起暂停累计，落地触及真实刺地再继续；短暂出入会保留该敌人的冷却与步距，不能蹭边连刷。
 *       圈自己用低频尖刺画面提示还在。
 *
 * 反制：绕开刺圈、等它到期（patchTicks）；飞在半空的生物从尖刺上方过去；站住不动可避免额外踩伤，层数越高越该绕远。
 */
namespace PokemonSkills {
    function spikesPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /**
     * 落点必须收到真实合法地表的支撑：水、岩浆、基岩、屏障与空中都算落空。
     * 用共享的 `WorldGeometry.ground` 吸附到最近地表，再核对脚下那一格确实是可站的实体方块。
     */
    function spikesLanding(world: CombatWorld, raw: CombatPoint): CombatPoint | null {
        const point = WorldGeometry.ground(world, raw, 6);
        const below = world.block(WorldCombat.point(point.x(), point.y() - 1, point.z()));
        if (below === null) return null;
        const id = String(below.id());
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return null;
        if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
        return point;
    }

    /** 脚部位置（碰撞箱底面中心）。 */
    function spikesFoot(body: CombatObservation): CombatPoint {
        return body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
    }

    /** 脚部与刺圈落在同一层地表才算踩上：楼上或另一层不隔空串判。 */
    function spikesOnLayer(field: WorldEffects.Field, body: CombatObservation): boolean {
        return Math.abs(spikesFoot(body).y() - field.position[1]) <= 0.8;
    }

    /**
     * 从刺圈略抬高的一点看向目标身体中心，墙与楼板挡住就不算踩到。
     * 场域本身关掉默认视线（`lineOfSight: false`），因为它落在贴地高度、默认射线容易在脚下地面反复判定；
     * 这里用自己的清晰起点重新做一次视线检查，保留隔墙/隔层的拦截。
     */
    function spikesReaches(world: CombatWorld, field: WorldEffects.Field, body: CombatObservation): boolean {
        const origin = WorldCombat.point(field.position[0], field.position[1] + 0.35, field.position[2]);
        return world.clear(origin, body.position());
    }

    /** 找同一片同层地上自己布下的尖刺，把层数并进这一层（最多 maxLayers 层），旧圈收回。 */
    function spikesLayers(world: CombatWorld, point: CombatPoint, radius: number, max: number): number {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, spikesRule);
        let layers = 1;
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            if (Math.abs(entry.position[1] - point.y()) > 0.8) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            layers = Math.min(max, Math.max(layers, (Number(entry.data.layers) || 1) + 1));
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
        return layers;
    }

    /**
     * 一次扎伤：按层数结算 `pierce`，从真实脚印点冒刺光。同一敌人两次扎伤之间至少隔 `interval`；
     * 只有真的结算到伤害才放命中反馈，伤害被拒绝时不假装扎中、不推动敌人。
     */
    function spikesStrike(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, body: CombatObservation, entering: boolean): boolean {
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (now < (next[ref] || 0)) return false;
        next[ref] = now + Math.max(6, Math.round(Number(field.data.interval) || 20));
        const layers = Math.max(1, Math.round(Number(field.data.layers) || 1));
        const gain = Math.max(0, Number(field.data.gain) || 0);
        const power = Math.max(0, Number(field.data.pierce) || 0) * (1 + (layers - 1) * gain);
        const foot = spikesFoot(body);
        const travel = field.data.travel || (field.data.travel = {});
        travel[ref] = 0;
        if (!hurt(world, actor, spikesId, power, { damage: damageSpec(spikesId, "pierce"), type: "ground" })) return false;
        WorldFeedback.emit(world, spikesScene, 1, foot.plus(WorldCombat.point(0, 0.05, 0)),
            { moment: entering ? "tread" : "step", target: ref, layers: layers,
                shards: Math.max(6, Math.round(Number(field.data.shards) || 22)),
                power: Math.round(power * 10) / 10, intensity: Math.max(0.6, Math.min(2.2, power / 40)),
                scale: field.radius / 2.4 }, 22);
        world.sound("cobblemon:impact.ground", foot, 12, "{}");
        if (entering) WorldFeedback.text(world, foot.plus(WorldCombat.point(0, 1.0, 0)), spikesTreadText, [layers], 26);
        return true;
    }

    /**
     * 单个敌人本 tick 在刺圈里的处理：进入时扎一次，之后按实际走过距离结算。
     * 跳起或不在同一层时把锚点更新到当前位置，跳过落地前的位移，落地后从触地点重新累计。
     */
    function spikesVisit(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const body = world.observe(actor);
        if (body === null) return;
        const ref = String(actor.ref());
        const last = field.data.last || (field.data.last = {});
        const travel = field.data.travel || (field.data.travel = {});
        const inside = field.data.inside || (field.data.inside = {});
        const foot = spikesFoot(body), here = [foot.x(), foot.z()];
        if (!body.grounded() || !spikesOnLayer(field, body) || !spikesReaches(world, field, body)) {
            inside[ref] = false;
            last[ref] = here;
            return;
        }
        // 入口用本单元自己的在场标记判定：默认场域成员即使被宿主重复标成 enter，也只算一次踩伤。
        if (!inside[ref]) {
            inside[ref] = true;
            last[ref] = here;
            travel[ref] = 0;
            spikesStrike(world, actor, field, body, true);
            return;
        }
        const previous = last[ref];
        last[ref] = here;
        if (previous === undefined) { travel[ref] = 0; return; }
        const dx = here[0] - previous[0], dz = here[1] - previous[1];
        const walked = Math.sqrt(dx * dx + dz * dz);
        // 传送、重载或被位移甩开：不把跳跃当成走路；小于阈值的位置抖动也不累计。
        if (!isFinite(walked) || walked > 4 || walked < 0.04) { if (walked > 4) travel[ref] = 0; return; }
        travel[ref] = (travel[ref] || 0) + walked;
        const step = Math.max(0.3, Number(field.data.step) || 0.9);
        const next = field.data.next || (field.data.next = {});
        if (travel[ref] >= step && world.tick() >= (next[ref] || 0)) {
            travel[ref] = Math.max(0, travel[ref] - step);
            spikesStrike(world, actor, field, body, false);
        }
    }

    // 尖刺圈：踏进来扎一次，之后每走 `step` 再扎；圈自己低频提示还在，表现随这个 field 效果一起收。
    WorldEffects.fieldRule(spikesRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            spikesVisit(world, actor, field);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            spikesVisit(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const inside = field.data.inside;
            if (inside) inside[String(actor.ref())] = false;
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.onEffect(world, effect.id(), "spikes:field:" + effect.id(), spikesScene, 1, spikesPoint(field),
                { moment: "hum", radius: field.radius, layers: Math.max(1, Math.round(Number(field.data.layers) || 1)),
                    shards: Math.max(10, Math.round(Number(field.data.shards) || 22)),
                    intensity: Math.max(1, Math.round(Number(field.data.layers) || 1)) });
        }
    }, { tags: [WorldEffects.categories.hazard], lineOfSight: false, transferable: true });

    define({
        id: spikesId,
        cooldownParameter: "recharge",
        name: "撒菱",
        description: "把一把尖锐碎片撒到选定的地面上，落地插成一圈尖刺：踏进去的敌人被扎一次，之后要在刺地里真的走出约 0.9 格才会再被扎，原地站着不会周期掉血。只有贴地的生物会被扎到，飞在半空的从上方过去；在同一片地上再撒一次会多叠一层，每层都让扎伤更重。",
        uses: ["提前封住一条窄路或门口", "把敌人逼进或逼出某片地", "在同一片地上叠层加伤"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 90,
        style: "spikes",
        defaults: { dense: false },
        fields: [flag("dense", "密布")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[spikesId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(spikesId, "tempo", context)),
                recover: Math.round(p(spikesId, "recover", context)),
                cooldown: Math.round(p(spikesId, "recharge", context)),
                active: 0,
                range: p(spikesId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("spikes:windup:" + action.id(), spikesScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", dense: config && config.dense ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[spikesId], detail: { values: config } };
            return { radius: p(spikesId, "patchRadius", context), geometry: "area", style: "spikes", color: 0xB9A88A,
                label: config && config.dense === true ? "撒菱·密布" : "撒菱·撒布" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.6, p(spikesId, "throwSpeed", action));
            const radius = Math.max(1.5, p(spikesId, "patchRadius", action));
            const ticks = Math.max(80, Math.round(p(spikesId, "patchTicks", action)));
            const pierce = p(spikesId, "pierce", action);
            const gain = Math.max(0, p(spikesId, "layerGain", action));
            const interval = Math.max(6, Math.round(p(spikesId, "treadInterval", action)));
            const step = Math.max(0.3, p(spikesId, "step", action));
            const shards = Math.max(10, Math.round(p(spikesId, "shards", action)));
            const maxLayers = Math.max(1, Math.round(p(spikesId, "maxLayers", action)));
            const scale = radius / 2.4;
            let laid = false;

            function lay(current: CombatAction, raw: CombatPoint): void {
                if (laid) return;
                laid = true;
                const scope = current.world();
                const point = spikesLanding(scope, raw);
                if (point === null) {
                    WorldFeedback.emit(scope, spikesScene, 1, raw, { moment: "miss", shards: shards, scale: scale }, 18);
                    sound(current, "minecraft:block.stone.break");
                    done(current);
                    return;
                }
                const layers = spikesLayers(scope, point, radius, maxLayers);
                const field = WorldEffects.field(scope, spikesRule, point, radius,
                    { pierce: pierce, gain: gain, layers: layers, interval: interval, step: step,
                        shards: shards, travel: {}, next: {}, last: {} }, ticks);
                WorldFeedback.emit(scope, spikesScene, 1, point,
                    { moment: "lay", radius: radius, layers: layers, shards: shards, scale: scale, intensity: layers }, 30);
                WorldFeedback.onEffect(scope, field, "spikes:hum", spikesScene, 1, point,
                    { moment: "hum", radius: radius, layers: layers, shards: shards, intensity: layers });
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), spikesLayText, [layers], 30);
                sound(current, "cobblemon:impact.ground");
                done(current);
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.24, gravity: 0.03, lifetime: 100,
                appearance: { item: "minecraft:flint", scale: 0.7 },
                impact: function (current, hit) { lay(current, hit.position()); }
            }, function (current) { lay(current, current.targetPosition()); });
            WorldFeedback.emit(world, spikesScene, 1, action.origin(),
                { moment: "throw", projectile: flight, shards: shards, scale: scale }, 26);
        }
    });
}
