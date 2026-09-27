/**
 * 求雨 / raindance 的雨区规则与属性结算，对所有战斗者一致。
 *
 * 雨区是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:raindance_soaked`
 * （身份 `world_combat:status/rained` 是本招的机读键，`world_combat:status/soaked` 是共享的“湿”身份，
 * 别的单元可以只问湿没湿）。
 *
 * 水 / 火倍率不凭余湿标记，而是读该活体**当前位置当前有效的语义天气**：`WorldEnvironment.weather`
 * 取覆盖该点、最新发布且未结束的天气贡献。异源晴雨重叠时只有最新的一方生效，不会两种相反的增伤叠算；
 * 离开雨区或被更新的天气覆盖后加成随覆盖失效，余湿只留作可被其他内容读取的身份。
 * 真实身火（原生 isOnFire）直接 `ignite 0` 浇灭，灼伤状态另行 `cure`——两者各自独立，没有 burn 身份的明火也灭。
 * 雨区每轮还按 quench 预算检查地面格，把野火 `breakBlock` 掉——火是消耗品，灭掉就不会自己烧回来。
 * 属性改写放在 `PokemonDamage.metadata`，结算前对任何来源的招式生效，改完再进入本系、相性与特性。
 */
namespace PokemonSkills {
    function raindancePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 原生事实：这个活体现在真的在燃烧（不限于 burn 状态）。 */
    function raindanceBurningBody(world: CombatWorld, actor: CombatActor): boolean {
        var native: { isOnFire(): boolean } | null = world.nativeEntity(actor);
        return native !== null && native.isOnFire();
    }

    function raindanceWet(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        var body = world.observe(actor);
        if (body === null) return false;
        // 只有当地天气真的有效为雨时才淋湿与浇灭：被更新的异源天气覆盖时不刷新湿身，状态与覆盖一致。
        if (!WorldEnvironment.isWeather(world, body.position(), "rain")) return false;
        var ticks = Math.max(40, Math.round(Number(field.data.soaked) || 80)) + 20;
        MobEffects.apply(world, actor, raindanceMark, ticks, 0);
        // 明火与灼伤是两件事：先把真实身火浇灭，再单独净化 burn 身份。
        var doused = raindanceBurningBody(world, actor) && world.ignite(actor, 0);
        var cured = CombatStatus.cure(world, actor, "burn");
        if (doused) WorldFeedback.emit(world, raindanceScene, 1, body.position(), { moment: "douse", target: String(actor.ref()) }, 26);
        if (doused || cured) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), raindanceDouseText, [], 26);
        return true;
    }

    /** Bounded cell walk: each scan checks a few ground cells inside the rain and puts out any open fire. */
    function raindanceQuench(world: CombatWorld, field: WorldEffects.Field): void {
        var centre = raindancePoint(field), budget = Math.max(1, Math.round(Number(field.data.quench) || 6));
        var base = Math.floor(centre.y());
        for (var i = 0; i < budget; i++) {
            var angle = world.random() * Math.PI * 2, distance = Math.sqrt(world.random()) * field.radius;
            var x = Math.floor(centre.x() + Math.cos(angle) * distance), z = Math.floor(centre.z() + Math.sin(angle) * distance);
            for (var dy = -1; dy <= 1; dy++) {
                var point = WorldCombat.point(x + 0.5, base + dy + 0.5, z + 0.5), block = world.block(point);
                if (block === null) continue;
                var id = String(block.id());
                if (id !== "minecraft:fire" && id !== "minecraft:soul_fire") continue;
                if (world.breakBlock(point, false) !== "") continue;
                WorldFeedback.emit(world, raindanceScene, 1, point, { moment: "douse" }, 20);
                break;
            }
        }
    }

    WorldEffects.fieldRule(raindanceField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!raindanceWet(world, actor, field)) return;
            var body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, raindanceScene, 1, body.position(),
                { moment: "drench", target: String(actor.ref()), density: field.data.density || 30 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), raindanceDrenchText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            raindanceWet(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            var centre = raindancePoint(field);
            // 当前有效天气仍是这场雨时铺满；被更新的异源天气覆盖时局部雨幕收束、变淡，恢复来源后再亮。
            var effective = WorldEnvironment.isWeather(world, centre, "rain");
            WorldFeedback.keep(world, "world_combat:move_raindance/field/" + effect.id(), raindanceScene, 1, centre,
                { moment: "field", density: field.data.density || 30, scale: (effective ? 1 : 0.55) * field.radius / 9,
                  intensity: effective ? 1 : 0.5 }, 20);
            raindanceQuench(world, field);
        }
    }, { identity: WorldEnvironment.weatherTag("rain"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("rain")] });

    PokemonDamage.metadata.define({ id: "world_combat:move_raindance/power", apply: function (context) {
        if (!context.world || !context.actor || !(context.metadata.power > 0)) return;
        var body = context.world.observe(context.actor);
        if (body === null) return;
        if (!WorldEnvironment.isWeather(context.world, body.position(), "rain")) return;
        var type = String(context.metadata.type).toLowerCase();
        context.metadata.power *= PokemonDamage.weatherMultiplier(context.metadata, "rain", type === "water" ? 1.5 : type === "fire" ? .5 : 1);
    } });
}
