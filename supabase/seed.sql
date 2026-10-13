-- Seed: Aise Bites demo restaurant
do $$
declare v_rest uuid; v_cat1 uuid; v_cat2 uuid; v_cat3 uuid; v_floor uuid; i int;
begin
  insert into restaurants(slug,name,gstin,fssai,logo_url) values ('aise-bites','Aise Bites','27ABCDE1234F1Z5','10012345678901','/logo.png')
  on conflict(slug) do update set name=excluded.name returning id into v_rest;
  -- fallback select if conflict path didn't return (older rows)
  if v_rest is null then select id into v_rest from restaurants where slug='aise-bites'; end if;
  insert into restaurant_settings(restaurant_id) values (v_rest) on conflict do nothing;
  insert into categories(restaurant_id,name,sort) values (v_rest,'Starters',1),(v_rest,'Mains',2),(v_rest,'Desserts & Beverages',3);
  select id into v_cat1 from categories where restaurant_id=v_rest and name='Starters' limit 1;
  select id into v_cat2 from categories where restaurant_id=v_rest and name='Mains' limit 1;
  select id into v_cat3 from categories where restaurant_id=v_rest and name='Desserts & Beverages' limit 1;
  insert into stations(restaurant_id,name) values (v_rest,'Kitchen'),(v_rest,'Tandoor'),(v_rest,'Bar'),(v_rest,'Dessert') on conflict do nothing;
  insert into menu_items(restaurant_id,category_id,name,description,price_paise,diet,tags,prep_min,station,bestseller,spicy) values
   (v_rest,v_cat1,'Paneer Tikka Angaraar','Smoky charred paneer, mint chutney',24900,'veg','{bestseller,spicy}',12,'Tandoor',true,3),
   (v_rest,v_cat1,'Hara Bhara Kebab','Spinach-pea patties, beet mayo',17900,'veg','{healthy}',10,'Kitchen',false,1),
   (v_rest,v_cat1,'Chicken 65','Curry-leaf tossed fried chicken',22900,'nonveg','{bestseller,spicy}',12,'Kitchen',true,3),
   (v_rest,v_cat1,'Masala Papad Basket','Roasted papad, onion-tomato masala',9900,'veg','{jainspecial}',5,'Kitchen',false,2),
   (v_rest,v_cat1,'Dahi Ke Kebab','Crisp outside, molten dahi inside',19900,'veg','{}',10,'Kitchen',false,1),
   (v_rest,v_cat1,'Fish Amritsari','Ajwain batter, tartar',25900,'nonveg','{spicy}',14,'Kitchen',false,2),
   (v_rest,v_cat1,'Veg Manchurian','Indo-chinese wok toss',16900,'veg','{}',10,'Kitchen',false,2),
   (v_rest,v_cat2,'Butter Chicken','Tomato-makhani, charcoal finish',29900,'nonveg','{bestseller}',15,'Tandoor',true,2),
   (v_rest,v_cat2,'Paneer Lababdar','Rich onion-tomato gravy',24900,'veg','{bestseller}',12,'Kitchen',true,2),
   (v_rest,v_cat2,'Dal Tadka + Jeera Rice','Ghee tadka dal, jeera rice',19900,'veg','{comfort}',12,'Kitchen',false,1),
   (v_rest,v_cat2,'Veg Biryani Handi','Dum biryani, mirchi ka salan',22900,'veg','{bestseller}',18,'Kitchen',true,2),
   (v_rest,v_cat2,'Chicken Dum Biryani','Sealed handi, saffron milk',29900,'nonveg','{bestseller}',20,'Kitchen',true,2),
   (v_rest,v_cat2,'Masala Dosa','Golden crisp, trio chutney + sambar',14900,'veg','{}',10,'Kitchen',false,1),
   (v_rest,v_cat2,'Chole Bhature','Amritsari chole, fluffy bhature',17900,'veg','{}',12,'Kitchen',false,2),
   (v_rest,v_cat2,'Jain Veg Thali','No onion-garlic, ghee roti, dal, sabzi',21900,'jain','{jain}',15,'Kitchen',false,1),
   (v_rest,v_cat3,'Gulab Jamun Cheesecake','Fusion cheesecake, rose syrup',14900,'veg','{chef-special}',8,'Dessert',false,0),
   (v_rest,v_cat3,'Sizzling Brownie','Hot brownie, vanilla scoop',17900,'egg','{bestseller}',8,'Dessert',true,0),
   (v_rest,v_cat3,'Mango Lassi','Alphonso pulp, saffron',9900,'veg','{seasonal}',5,'Bar',false,0),
   (v_rest,v_cat3,'Filter Coffee','South Indian degree coffee',7900,'veg','{}',4,'Bar',false,0),
   (v_rest,v_cat3,'Masala Shikanji','Nimbu, roasted jeera, kala namak',5900,'veg','{}',3,'Bar',false,0);
  insert into floors(restaurant_id,name) values (v_rest,'Ground Floor') on conflict do nothing;
  select id into v_floor from floors where restaurant_id=v_rest limit 1;
  for i in 1..10 loop
    insert into tables(restaurant_id,floor_id,label) values (v_rest,v_floor,'T'||i) on conflict do nothing;
  end loop;
end $$;
