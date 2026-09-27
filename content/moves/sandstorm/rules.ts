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
        // 受风位移走原生 hitDisplace：保留击退事件、抗性与权限，位移被拒不影响已结算的伤害。
        if (drift > 0) world.hitDisplace(actor, wind.scale(drift));
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
            // 类型改后及时开闭 owner 的特防窗口：每次扫描都重判，岩石之躯在沙里就保有本场窗口，失去岩石属性就地收回。
            sandstormRockWindow(world, actor, field);
            if (sandstormImmune(world, actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            if (!sandstormBand(field).contains(body.position())) return;
            const pass = Number(field.data.pass) || 0, ref = String(actor.ref());
            const hits: any = field.data.hits || (field.data.hits = {});
            // 每趟每敌只结算一次：条带扫过时不会在同一趟里反复磨同一个人。
            if (Number(hits[ref]) === pass) return;
            hits[ref] = pass;
            if (sandstormSheltered(world, body, field)) {
                const wind = sandstormWind(field);
                WorldFeedback.emit(world, sandstormScene, 1, body.position(),
                    { moment: "lee", target: ref, density: 10,
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
            const interval = Math.max(10, Math.round(Number(field.data.interval) || 70));
            const now = world.tick();
            // 条带在整段间隔里连续从沙幕上风缘推进到下风缘；每过一个间隔算新的一趟。
            if (!(Number(field.data.cycleStart) > 0)) field.data.cycleStart = now;
            const elapsed = Math.max(0, now - Number(field.data.cycleStart));
            const pass = Math.floor(elapsed / interval);
            const progress = Math.min(1, (elapsed - pass * interval) / interval);
            const span = 2 * field.radius + width;
            field.data.band = -field.radius + progress * span;
            field.data.pass = pass;
            if (Number(field.data.hitPass) !== pass) { field.data.hitPass = pass; field.data.hits = {}; }
            const bandPoint = centre.plus(wind.scale(Number(field.data.band)));
            const height = Number(field.data.height) || Math.max(1.2, Math.min(3.2, width));
            const yaw = Number(field.data.yaw) || Math.atan2(wind.x(), wind.z()) * 180 / Math.PI;
            WorldFeedback.keep(world, "world_combat:move_sandstorm/gust", sandstormScene, 1, bandPoint,
                { moment: "gust", direction: [wind.x(), 0, wind.z()], width: width, radius: field.radius,
                    density: field.data.density || 30, scale: field.radius / 9,
                    span: Number(field.data.span) || field.radius * 2, height: height, yaw: yaw },
                Math.max(10, Math.round(interval / 4)));
            // 持续表现绑在沙幕效果自己身上：天然到期、提前驱散或施法者离场时随效果一起收。
            if (!field.data.bound) {
                field.data.bound = true;
                WorldFeedback.onEffect(world, effect.id(), "world_combat:move_sandstorm/field", sandstormScene, 1, centre,
                    { moment: "field", direction: [wind.x(), 0, wind.z()], density: field.data.density || 30,
                        radius: field.radius, scale: field.radius / 9,
                        span: Number(field.data.span) || field.radius * 2, width: width, height: height, yaw: yaw });
            }
        }
    }, { identity: WorldEnvironment.weatherTag("sandstorm"), tags: [WorldEffects.categories.weather, WorldEnvironment.weatherTag("sandstorm")], lineOfSight: false });
}
