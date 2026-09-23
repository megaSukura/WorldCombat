/**
 * 撒菱 / spikes 的出手方式。
 *
 * 核心念头：把一把尖锐碎片朝选定的地面撒出去，碎片落地插成一圈尖刺留在那里；谁踏进来就被扎一次，
 *   还站在里面会每隔一会儿再被扎，同一片地上再撒一次就多叠一层、扎得更狠。它是本组唯一**层数叠加、
 *   只扎贴地目标**的伤害陷阱。
 *
 * 三幕：
 *   起（windup，提交前）：掌心拢起碎屑的预告。
 *   撒（toss→lay）：提交后碎片沿低弧线飞出，落地插成半径 patchRadius 的尖刺圈（WorldEffects.field，
 *       规则 `world_combat:hazard/spikes` 由本单元注册），并把同一片地上已有的自方尖刺并入新的一层。
 *   扎（tread→hum）：尖刺圈存续 patchTicks；贴地的非友方 `enter` 时按层数结算一次 `pierce`（地属性物理），
 *       留在圈内每隔 treadInterval 再扎一次；圈自己用低频尖刺画面提示还在。
 *
 * 反制：绕开刺圈、等它到期（patchTicks）；飞在半空的生物从尖刺上方过去；层数越高越该绕远。
 */
namespace PokemonSkills {
    function spikesPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 落点收到地表上方一格：共享的下投射助手（尖刺圈中心落在空气格，判定视线不被地面挡住）。 */
    function spikesGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        return WorldGeometry.ground(world, point);
    }

    /** 找同一片地上自己布下的尖刺，把层数并进这一层（最多 maxLayers 层），旧圈收回。 */
    function spikesLayers(world: CombatWorld, point: CombatPoint, radius: number, max: number): number {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, spikesRule);
        let layers = 1;
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            layers = Math.min(max, Math.max(layers, (Number(entry.data.layers) || 1) + 1));
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
        return layers;
    }

    /** 踩在尖刺上：按当前层数结算一次 `pierce`；fresh 表示刚踏进来（不吃再扎节流、并报一句浮字）。 */
    function spikesTread(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): void {
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return;
        next[ref] = now + Math.max(6, Math.round(Number(field.data.interval) || 20));
        const layers = Math.max(1, Math.round(Number(field.data.layers) || 1));
        const gain = Math.max(0, Number(field.data.gain) || 0);
        const power = Math.max(0, Number(field.data.pierce) || 0) * (1 + (layers - 1) * gain);
        if (!hurt(world, actor, spikesId, power, { damage: damageSpec(spikesId, "pierce"), type: "ground" })) return;
        WorldFeedback.emit(world, spikesScene, 1, body.position(),
            { moment: "tread", target: ref, layers: layers, shards: Math.max(6, Math.round(8 + power * 0.6)), scale: field.radius / 2.4 }, 22);
        world.sound("cobblemon:impact.ground", body.position(), 14, "{}");
        if (fresh) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), spikesTreadText, [layers], 26);
    }

    // 尖刺圈：踏进来扎一次，留在圈里按间隔再扎；圈自己低频提示还在。规则登记一次，全场共用。
    WorldEffects.fieldRule(spikesRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            spikesTread(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            spikesTread(world, actor, field, false);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "spikes:field:" + effect.id(), spikesScene, 1, spikesPoint(field),
                { moment: "hum", radius: field.radius, layers: Math.max(1, Math.round(Number(field.data.layers) || 1)),
                    shards: Math.max(10, Math.round(Number(field.data.shards) || 22)), scale: field.radius / 2.4 }, 40);
        }
    }, { tags: [WorldEffects.categories.hazard] });

    define({
        id: spikesId,
        cooldownParameter: "recharge",
        name: "撒菱",
        description: "把一把尖锐碎片撒到选定的地面上，落地插成一圈尖刺：踏进圈里的敌人被扎一次，还站在里面会持续被扎。只有贴地的生物会被扎到，飞在半空的从上方过去；在同一片地上再撒一次会多叠一层，每层都让扎伤更重。",
        uses: ["提前封住一条窄路或门口", "把敌人逼进/逼出某片地", "在同一片地上叠层加伤"],
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
            const shards = Math.max(10, Math.round(p(spikesId, "shards", action)));
            const maxLayers = Math.max(1, Math.round(p(spikesId, "maxLayers", action)));
            const scale = radius / 2.4;
            let laid = false;

            function lay(current: CombatAction, raw: CombatPoint): void {
                if (laid) return;
                laid = true;
                const scope = current.world();
                const point = spikesGround(scope, raw);
                const layers = spikesLayers(scope, point, radius, maxLayers);
                WorldEffects.field(scope, spikesRule, point, radius,
                    { pierce: pierce, gain: gain, layers: layers, interval: interval, shards: shards, next: {} }, ticks);
                WorldFeedback.emit(scope, spikesScene, 1, point,
                    { moment: "lay", radius: radius, layers: layers, shards: shards, scale: scale }, 30);
                WorldFeedback.keep(scope, "spikes:hum:" + String(current.id()), spikesScene, 1, point,
                    { moment: "hum", radius: radius, layers: layers, shards: shards, scale: scale }, ticks);
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
