/**
 * 沙暴 / sandstorm 的沙幕规则与磨蚀结算，对所有战斗者一致。
 *
 * 沙幕是一条区域规则：每 5 刻扫描半径内的活体，给他们补 `world_combat:sandstorm_swept`
 * （共享身份 `world_combat:status/sandstorm`，只借身份、不带共享行为）。沙幕本身只管标记；
 * 磨蚀发生在**顺风推进的窄条带**里：落点与施法者连线定下水平风向，每一趟沙阵从沙幕上风缘起、
 * 沿风向推进 gustStep 格、带宽 2×gustWidth；只有当次条带内、且朝上风方向一条原生碰撞射线
 * 没被实心方块挡住的活体，才按既有 scour 预算被磨掉最大生命，并被统一顺风推出 drift 格。
 * 岩石／地面／钢之躯免疫磨蚀；岩石之躯在沙里得到一个**本场实例窗口**的特防 +1，出圈或沙幕结束时
 * 只撤销本窗口（NativeEffects.boostWindow，避免反复进出累加）。没有随机砂岩实体柱，沙痕只是表面表现。
 */
namespace PokemonSkills {
    export function sandstormPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 岩石／地面／钢之躯不受沙暴磨蚀；无属性者（原版生物、玩家）照单全收。 */
    export function sandstormImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const types = NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
        return types.indexOf("rock") >= 0 || types.indexOf("ground") >= 0 || types.indexOf("steel") >= 0;
    }

    function sandstormRock(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const types = NativeEffects.types(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
        return types.indexOf("rock") >= 0;
    }

    /** 提交时记录的施法者→落点水平风向，缺省 +z；每次结算和表现读同一份。 */
    export function sandstormWind(field: WorldEffects.Field): CombatPoint {
        const value = field.data.wind;
        if (Array.isArray(value) && value.length === 3) {
            const heading = WorldCombat.point(Number(value[0]) || 0, 0, Number(value[2]) || 0);
            if (heading.length() > 1e-6) return heading.unit();
        }
        return WorldCombat.point(0, 0, 1);
    }

    /** 当次沙阵条带：上风缘起、沿风向 gustStep 长、横跨整个沙幕。 */
    function sandstormBand(field: WorldEffects.Field): WorldGeometry.Region {
        const wind = sandstormWind(field), centre = sandstormPoint(field);
        const half = Math.max(0.5, Number(field.data.gustWidth) || field.radius * 0.35);
        const offset = isFinite(Number(field.data.band)) ? Number(field.data.band) : -field.radius;
        const origin = centre.plus(wind.scale(offset - half));
        return WorldGeometry.lane(origin, wind, half * 2, field.radius);
    }

    /** 朝上风方向一条原生方块碰撞射线被实心方块挡住，就处在掩体的背风面。 */
    function sandstormSheltered(world: CombatWorld, body: CombatObservation, field: WorldEffects.Field): boolean {
        const wind = sandstormWind(field);
        const from = body.position();
        const to = from.minus(wind.scale(field.radius + 1));
        const clip = world.clipBlocks(from, to);
        return clip !== null && clip.blocked();
    }

    /** 一趟磨蚀：先结算允许伤害，再顺风推；位移被拒（Boss）不影响已结算的伤害。 */
    function sandstormScour(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, body: CombatObservation): void {
        const amount = Math.max(1, Math.floor(body.maxHealth() * (Number(field.data.scour) || 0.0625)));
        const dealt = -world.health(actor, -amount, "world_combat:sandstorm");
        const wind = sandstormWind(field), drift = Number(field.data.drift) || 0;
        if (drift > 0) world.displace(actor, wind.scale(drift));
        WorldFeedback.emit(world, sandstormScene, 1, body.position(),
            { moment: "scour", target: String(actor.ref()), grains: Math.max(8, Math.round(6 + dealt * 1.5)),
                direction: [wind.x(), 0, wind.z()], drift: drift, scale: field.radius / 9 }, 20);
    }

    function sandstormLay(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const ticks = Math.max(40, Math.round(Number(field.data.swept) || 80)) + 20;
        MobEffects.apply(world, actor, sandstormMark, ticks, 0);
    }

    /** 岩石之躯的防御窗口按「本场沙幕 + 这个身体」一份；重复进入只续旧窗口，不叠等级。 */
    function sandstormRockClose(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const windows = field.data.rockWindows || {}, ref = String(actor.ref()), id = Number(windows[ref] || 0);
        if (id) NativeEffects.windowClose(world, id);
        delete windows[ref];
    }
    function sandstormRockWindow(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        if (!sandstormRock(world, actor)) { sandstormRockClose(world, actor, field); return false; }
        const windows = field.data.rockWindows || (field.data.rockWindows = {}), ref = String(actor.ref());
        const existing = Number(windows[ref] || 0);
        if (existing && world.effects(actor, "cobblemon_world_combat:modifier").some(function (view) { return view.id() === existing; })) return false;
        if (!field.id || !field.remaining) return false;
        const id = NativeEffects.boostWindow(world, actor, { spd: 1 }, Math.max(1, Math.round(field.remaining)), "sandstorm:" + field.id);
        if (!id) return false;
        const owner: CombatStages.WindowOwner = { actor: String(world.source().ref()), definition: "world_combat:field", id: field.id };
        if (!world.operation(id, "world_combat:stage_owner", JSON.stringify(owner))) { NativeEffects.windowClose(world, id); return false; }
        windows[ref] = id;
        return true;
    }

    WorldEffects.fieldRule(sandstormField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sandstormLay(world, actor, field);
            const body = world.observe(actor);
            if (body === null) return;
            const wind = sandstormWind(field);
            if (sandstormRock(world, actor)) {
                if (sandstormRockWindow(world, actor, field)) {
                    WorldFeedback.emit(world, sandstormScene, 1, body.position(), { moment: "harden", target: String(actor.ref()) }, 22);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sandstormHardenText, [], 22);
                }
                return;
            }
            if (sandstormImmune(world, actor)) {
                WorldFeedback.emit(world, sandstormScene, 1, body.position(),
                    { moment: "grit", target: String(actor.ref()), direction: [wind.x(), 0, wind.z()], scale: field.radius / 9 }, 20);
                return;
            }
            WorldFeedback.emit(world, sandstormScene, 1, body.position(),
                { moment: "scour", target: String(actor.ref()), direction: [wind.x(), 0, wind.z()], scale: field.radius / 9 }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), sandstormScourText, [], 22);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sandstormLay(world, actor, field);
            if (!field.data.pulse) return;
            if (sandstormImmune(world, actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            if (!sandstormBand(field).contains(body.position())) return;
            if (sandstormSheltered(world, body, field)) {
                const wind = sandstormWind(field);
                WorldFeedback.emit(world, sandstormScene, 1, body.position(),
                    { moment: "lee", target: String(actor.ref()), density: 10,
                        direction: [wind.x(), 0, wind.z()], scale: field.radius / 9 }, 18);
                return;
            }
            sandstormScour(world, actor, field, body);
        },
        leave: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            sandstormRockClose(world, actor, field);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = sandstormPoint(field), wind = sandstormWind(field);
            const width = Math.max(0.5, Number(field.data.gustWidth) || field.radius * 0.35);
            const step = Math.max(0.5, Number(field.data.gustStep) || field.radius * 0.7);
            const interval = Math.max(10, Math.round(Number(field.data.interval) || 70));
            const now = world.tick();
            if (!(Number(field.data.next) > 0)) field.data.next = now + interval;
            field.data.pulse = now >= Number(field.data.next);
            if (field.data.pulse) {
                field.data.next = now + interval;
                // 每趟沙阵从上风缘起沿风向推进一条窄带；越过下风缘后从上风缘重新起风。
                let band = isFinite(Number(field.data.band)) ? Number(field.data.band) : -field.radius;
                band += step;
                if (band > field.radius + width) band = -field.radius;
                field.data.band = band;
                const bandPoint = centre.plus(wind.scale(band));
                WorldFeedback.emit(world, sandstormScene, 1, bandPoint,
                    { moment: "gust", direction: [wind.x(), 0, wind.z()], width: width,
                        radius: field.radius, density: field.data.density || 30, scale: field.radius / 9 }, interval);
            }
            // 持续表现绑在沙幕效果自己身上：天然到期、提前驱散或施法者离场时随效果一起收。
            if (!field.data.bound) {
                field.data.bound = true;
                WorldFeedback.onEffect(world, effect.id(), "world_combat:move_sandstorm/field", sandstormScene, 1, centre,
                    { moment: "field", direction: [wind.x(), 0, wind.z()], density: field.data.density || 30,
                        radius: field.radius, scale: field.radius / 9 });
            }
        }
    }, { identity: WorldEnvironment.weatherTag("sandstorm"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("sandstorm")], lineOfSight: false });
}
