var zoomPlus='';
var zoomMinus='';
var zoomExtend='';
var layer_unique='';
var torque_player='';
var duration=15;
var t0;

var ui_config = {

  map_types:{'m':'cro','p':'occurrence','q':'counts','r':'traces','py':'phenology','t':'meteo'},
  map_types_inv:{'cro':'m','occurrence':'p','counts':'q','traces':'r','phenology':'py','meteo':'t'},
  state:'active',
  mode:'double',
  debug: false,
  desktop: true,
  tablet: false,
  embedded: false,
  year_mode:'calendar',
  prev_year_mode:'',
  last_week: 0,
  last_year: parseInt($('#last_52_weeks_year').val()),
  current_conf:{'left':'', 'right':'', 'unique':''},
  disabled_years:{
    'context': {'2018-':'x','2019-':'x','2019':'x','2020':'x'},
    'cro': {'2018-':'x','2019-':'x','2019':'x','2020':'x'}
  },

  init: function(desktop,mode,tablet){

    this.desktop=desktop;
    this.tablet=tablet;


    if(mode==='embedded') {

      this.embedded=true;
      this.mode='single';

    }

    if ($.browser.msie && $.browser.version < '11.1') {}
    else {
      if($('#sidebar-wrapper').length) new SimpleBar($('#sidebar-wrapper')[0]);
    }


    clipboard=new Clipboard('#share_btn');

    clipboard.on('success', function(e) {
      ui_config.setTooltip(e.trigger, 'Copied!');
      ui_config.hideTooltip(e.trigger);
    });

    $('#share_url').val(window.location.href);

    ui_config.last_week=parseInt($('#last_52_weeks_week').val());

    $('[data-info="tooltip"]').tooltip();

    $('.timeline-tooltip').position({
      'within': '#map',
      'collision': 'fit'
    });



    this.initSingleMapMode('unique',true);

    this.updateShareCode();
    if(this.embedded==false) ui_config.initTimeMode();


  },
  blockMissingYears: function(){

    if(!this.isLastSplitReached()){

      this.disabled_years['context'][(this.getLastSplitYear()+1)+'-']='x';
      this.disabled_years['cro'][(this.getLastSplitYear()+1)+'-']='x';

    }

  },
  setConfig: function(new_conf,state,position){

    if(state==='current') this.current_conf[position]=new_conf;
    else if(state==='new') this.new_conf[position]=new_conf;

  },
  getConfig: function(state,position){

    if(state==='current') return this.current_conf[position];
    else if(state==='new') return this.new_conf[position];

  },
  /* Initial config unique map */
  initUniqueMap: function(){

    var new_conf=Object.create(MapConf);
    this.setConfig(new_conf,'current','unique');

    var new_conf=Object.create(MapConf);
    this.setConfig(new_conf,'new','unique');


  },
  /* Setting initial species, year, map_type selection */
  loadConfig: function(species_code,map_code,year,position,input_type){

    var curr_conf=Object.create(MapConf);
    curr_conf.init(species_code,'',input_type,year,map_code);

    if(year.toString().indexOf("-") > -1) this.year_mode='split';

    if(year.toString().indexOf("_") > -1) this.year_mode='live';


    this.setConfig(curr_conf,'current',position);

  },
  showUpdating:function(){

    $('#updating_msg').show();
    $('#frozen_full').addClass('active');

    $('#realtime_info').hide();


  },
  hideLoader: function(){

    $('#updating_msg').hide();
    $('#frozen_full').removeClass();

    if(!ui_config.isEmbedded()) this.updateTimeModeInfo();

  },
  getImagePathByCode: function(code,_type,thumb){

        var path = $('#current_path').val();

        var species_img='species';
        if(thumb) species_img='species_thumb';

        if(_type==='species') return path+"/img/"+species_img+"/"+code.toLowerCase()+".png";


  },
  updateShareState: function(){

    if($('#share_panel').hasClass('shown'))  {

      if(ui_config.isSingleMode()) {
        $('.panel_btn').hide();
        $('.select_lr').hide();

      }
      else{

        $('.panel_btn').show();
        $('.select_lr').show();

      }

      this.updateShareCode();

    }
  },
  getShareURL: function(position){

    var species_code='';
    var year='';
    var map_type='';
    var position='';

    if(ui_config.isSingleMode()) position='unique';
    else position=$('.panel_btn.active_side').data('value');

    species_code=this.current_conf[position].getSpeciesCode();
    if(ui_config.isLastWeeks()){

      year_live=this.current_conf[position].getYear();

      if(year_live==this.getLast52WeeksRange()) year=this.getLast52WeeksUrlVal();
      else year=ui_config.getLast52WeeksPrevUrlVal();

    }
    else year=this.current_conf[position].getYear();
    map_type=this.current_conf[position].getMapType();

    return $('#embedded_url').val().replace('species_code',species_code).replace('year',year).replace('map_type',map_type);


  },
  getConfigURL: function(){

      /* TODO: Embedded test */

      if(ui_config.isSingleMode()) {

        var species_code_right=this.current_conf['unique'].getSpeciesCode();
        var year=this.current_conf['unique'].getYear();

        if (ui_config.isLastWeeks()){

          if(year==this.getLast52WeeksRange()) year=this.getLast52WeeksUrlVal();
          else year=this.getLast52WeeksPrevUrlVal();

        }

        return '#home/'+species_code_right+'/'+this.current_conf['unique'].getMapTypeCode()+year;

      }
      else{

        var species_code_right=this.current_conf['right'].getSpeciesCode();
        var year_left=this.current_conf['left'].getYear();
        var year_right=this.current_conf['right'].getYear();

        if (ui_config.isLastWeeks()) {

          if(year_left==this.getLast52WeeksRange()) year_left=this.getLast52WeeksUrlVal();
          else year_left=this.getLast52WeeksPrevUrlVal();

          if(year_right==this.getLast52WeeksRange()) year_right=this.getLast52WeeksUrlVal();
          else year_right=this.getLast52WeeksPrevUrlVal();

        }

        return '#home/'+this.current_conf['left'].getSpeciesCode()+'/'+this.current_conf['left'].getMapTypeCode()+year_left+
          '/'+species_code_right+'/'+this.current_conf['right'].getMapTypeCode()+year_right+'/';

      }
  },
  isEmbedded: function(){

    return this.embedded;

  },
  isDebug: function(){

    return this.debug;

  },
  getLastSplitYear: function(){

    if(this.last_week <27) return this.last_year-2;
    else return this.last_year-1;

  },
  isLastSplitReached: function(){

    return this.last_week >=27;

  },
  getLast52WeeksRange: function(){

    var last_year=parseInt($('#last_52_weeks_year').val());
    return ((last_year-1)+'_'+last_year);

  },
  getLast52WeeksPrevRange: function(){

    var last_year=parseInt($('#last_52_weeks_year').val());
    return ((last_year-2)+'_'+(last_year-1));

  },
  getLast52WeeksUrlVal: function(){

    return '52weeks';

  },
  getLast52WeeksPrevUrlVal: function(){

    return '52weeksprev';

  },
  initSingleMapMode: function(position,update_ui){

    layer_config.initUniqueBase();
    if(!ui_config.isEmbedded()) {

      this.updateUniqueMapUi(position,update_ui);
      ui_config.enableZoomLevels();

    }



  },
  setSingleMapMode: function(position,update_ui,from_editor,zoom){

    this.updateUniqueMapUi(position,update_ui);
    if(!from_editor) layer_config.setUniqueBase();
    else layer_config.setUniqueBase(zoom);

    if(!ui_config.isEmbedded()) ui_config.enableZoomLevels();

    /* TODO: improve */
    loadMap(false);
    // if(ui_config.hasPhenology()) pheno.reDraw('s_1','left');
    torque_player.updateTimeLine();


  },
  enableZoomLevels: function(){

    if(layer_config.getCurrent('zoom')>=layer_config.getCurrent('zoom_max')) zoomPlus.disable();
    else  zoomPlus.enable();
    if(layer_config.getCurrent('zoom')<=layer_config.getCurrent('zoom_min')) zoomMinus.disable();
    else zoomMinus.enable();

  },
  updateShareCode: function() {

    var option=$('.size_selector input:checked').attr('id');
    var iframe_size = '450px';
    if (option == 'large') {iframe_size = '750px'}



    var code = '<iframe width="'+iframe_size+'" height="'+iframe_size+'" src="'+ui_config.getShareURL()+'" frameborder="0" allowfullscreen></iframe>';
    $('#share-code').html(code);

    var current_url = encodeURIComponent(window.location.href);
    var facebook = 'https://www.facebook.com/sharer/sharer.php?u='+current_url;
    var twitter = 'https://twitter.com/intent/tweet?url='+current_url+'&text=EuroBirdPortal%20Life%20Project&hashtags=ebp,birds';
    var google = 'https://plus.google.com/share?url='+current_url;

    $('#share_panel #facebook').attr('href',facebook);
    $('#share_panel #twitter').attr('href',twitter);
    $('#share_panel #google').attr('href',google);

  },
  setCommonName: function(position,common_name){

    return this.current_conf[position].setCommonName(common_name);

  },
  getType: function(position){

    return this.current_conf[position].getMapTypeCode();

  },
  isDesktop: function(){

    return this.desktop;

  },
  isTablet: function(){

    return this.tablet;

  },
  isDoubleMode: function(){

    return this.mode==='double';

  },
  isSingleMode: function(){

    return this.mode==='single';

  },
  isMobile: function(){

    return !this.desktop;

  },
  isEmbedded: function(){

    return this.embedded;

  },
  isInterval: function(){

    return this.year_mode==='split';
  },
  isLastWeeks: function(){

    return this.year_mode==='live';

  },
  hasRecord: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='traces';
    else return this.current_conf['left'].getMapType()==='traces' || this.current_conf['right'].getMapType()==='traces';


  },
  hasModel: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='cro';
    else return this.current_conf['left'].getMapType()==='cro' || this.current_conf['right'].getMapType()==='cro';


  },
  hasOccurrence: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='occurrence';
    else return this.current_conf['left'].getMapType()==='occurrence' || this.current_conf['right'].getMapType()==='occurrence';


  },
  hasCounts: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='counts';
    else return this.current_conf['left'].getMapType()==='counts' || this.current_conf['right'].getMapType()==='counts';


  },
  hasMeteo: function(position){

    if(this.isSingleMode()) return this.current_conf['unique'].getInputType()==='temperature' || this.current_conf['unique'].getInputType()==='precipitation';
    else return this.current_conf[position].getInputType()==='temperature' || this.current_conf[position].getInputType()==='precipitation';

  },
  hasEmptyGlobalPhenology: function(){

    if(this.isSingleMode() && this.hasMeteo('right')) return true;
    else return false;

  },
  hasPhenology: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='phenology';
    else return this.current_conf['left'].getMapType()==='phenology' || this.current_conf['right'].getMapType()==='phenology';

  },
  isPhenology: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='phenology';
    else return this.current_conf['left'].getMapType()==='phenology' && this.current_conf['right'].getMapType()==='phenology';

  },
  isPhenologyPos: function(position){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='phenology';
    else return this.current_conf[position].getMapType()==='phenology';

  },
  isRecord: function(position){

    return this.current_conf[position].getMapType()==='traces';

  },
  getSpecies: function(position){

    return this.current_conf[position].getSpeciesCode();

  },
  getYear: function(position){

    if(this.current_conf[position].getYear().toString().indexOf("_") > -1) return this.current_conf[position].getYear().toString();
    else return this.current_conf[position].getYear().toString().substring(0, 4);

  },
  getYearVal: function(position){

    return this.current_conf[position].getYear();

  },
  isRecordBoth: function(){

    if(this.isSingleMode()) return this.current_conf['unique'].getMapType()==='traces';
    else return this.current_conf['left'].getMapType()==='traces' && this.current_conf['right'].getMapType()==='traces';


  },
  setTooltip: function (btn, message) {
          $(btn).tooltip('hide')
            .attr('data-original-title', message)
            .tooltip('show');
  },
  hideTooltip: function (btn) {
          setTimeout(function() {
            $(btn).tooltip('hide');
            $(btn).removeAttr('data-original-title');
          }, 2000);
  }
};



var MapConf = {
  type: '',
  year:'',
  species_code:'',
  common_name:'',
  map_type:'',
  input_type:'',
  print: function() {
    console.log('Species_code: ' +this.species_code+' Map type: '+this.map_type+' Input type: '+this.input_type+' Year: '+this.year+' Type: '+this.type);
  },
  init:function(species_code,common_name,input_type,year,map_type){

    this.species_code=species_code;
    this.common_name=common_name;
    this.input_type=input_type;
    this.year=year;
    this.map_type=map_type;

  },
  setYear: function(year){
    this.year=year;
  },
  getYear: function(){
    return this.year;
  },
  setType: function(type){
    this.type=type;
  },
  setSpeciesCode: function(species_code){
    this.species_code=species_code;
  },
  getSpeciesCode:  function(){
    return this.species_code;
  },
  getSpeciesVal:  function(){

    if(ui_config.isInterval()) return "x"+this.species_code;
    else return this.species_code;

  },
  setCommonName: function(common_name){
    this.common_name=common_name;
  },
  getCommonName: function(){
    return this.common_name;
  },
  setMapType: function(map_type){
    this.map_type=map_type;
  },
  getMapTypeCode: function(){
    return this.map_type;
  },
  getMapType: function(){
    return ui_config.map_types[this.map_type];
  },
  setInputType: function(input_type){
    this.input_type=input_type;
  },
  getInputType: function(){
    return this.input_type;
  },
  isCicleYear: function(){
    return this.year.toString().indexOf("-") > -1;
  },
  getSimpleYear: function(){
    return this.year.toString().substring(0, 4);
  },
  isSpecies: function(){
    return this.input_type==='species' || (this.map_type==='p' || this.map_type==='m' || this.map_type==='q' || this.map_type==='r');
  },
  isTemperature: function(){
    return this.input_type==='temperature';
  },
  isPrecipitation: function(){
    return this.input_type==='precipitation';
  },
  isMeteo: function(){
    return this.input_type==='precipitation' || this.input_type==='temperature';
  },
  isCroMap: function(){

    return ui_config.map_types[this.map_type]==='cro';

  },

};



function loadMap(reload){

  ui_config.showUpdating();

  if(layer_unique) {

    layer_unique.remove();

  }

  if(ui_config.hasPhenology()){

      if (pheno.isShown()) pheno.removeChart();

      var base_mode=torque_manager.getxy30x30();

      if(ui_config.isDoubleMode() && ui_config.isPhenology()) {

        //pheno.initChart(ui_config.getPhenologySQL('both'), base_mode, 'both');
          pheno.initChart(ui_config.getPhenologySQL('left'), base_mode, 'left');
          pheno.initChart(ui_config.getPhenologySQL('right'), base_mode, 'right');
      }

      else if(ui_config.isPhenologyPos('left')) pheno.initChart(ui_config.getPhenologySQL('left'), base_mode, 'left');
      else pheno.initChart(ui_config.getPhenologySQL('right'), base_mode, 'right');

  }
  else{

    if (pheno.isShown()) pheno.removeChart();

  }


  var new_css='';
  var new_sql='';

  if(reload){

    new_css=cssEditor.getValue();

  }
  else{

      new_css=torque_manager.getCSS(torque_manager.getxy30x30(),map.getZoom());

  }


  var map_config=this.torque_manager.getNamedMap();

  var interval=false;

  if(ui_config.isInterval()) interval=true;


  if(map_config.params['year_l']){


    if(interval) map_config.params['species_l']='x'+map_config.params['species_l'];


  }
  if(map_config.params['year_r']){

      if(map_config.params['year_r'].indexOf('_')>-1) {

        //map_config.params['year_r']='_2115';
        if(interval) map_config.params['species_r']='_x'+map_config.params['species_r'];


      }
      else {

        if(interval) map_config.params['species_r']='x'+map_config.params['species_r'];

      }



  }
  if(map_config.params['year']){


    if(map_config.params['year'].indexOf('_')>-1) {

      //map_config.params['year']='_2115';

    }
    else {

      if(interval) map_config.params['species']='x'+map_config.params['species'];

    }


  }



  cartodb.createLayer(map, {
      type: 'torque',
      user_name: 'trials',
      cartocss: new_css,
      options: {
          named_map: {
              params: map_config.params,
              type:"torque",
              name: 'trials@'+map_config.map_name
          }
      }
},{ https: true }).done(function(layer) {


          layer.setZIndex(30);
          map.addLayer(layer);

          layer_unique=layer;
          addLoader(layer_unique);

          $('.cartodb-timeslider').remove();

          layer.on('change:time', function(changes) {

            var step=layer_unique.getStep();
            torque_player.setStep(step);

            if(ui_config.isInterval() || ui_config.isLastWeeks()){

              setYearInfo(step);

            }

          });
      });


}

  function showLoadMapError(){

      $('#updating_msg .title').html('Map combination can\'t be loaded');
      $('#updating_msg .spinner').html('<i class="fa fa-4x fa-exclamation-circle"></i>');
      $('#updating_msg').append('<a class="text-center" href="'+window.location.href.split("#")[0]+'">Reload website</i>');


  }

  /* Updates current year in timeline */
  function setYearInfo(step){

    var position='left';
    var is_single_mode=ui_config.isSingleMode();
    if(is_single_mode) position='unique';

    var year_left=ui_config.getYear(position);
    if(ui_config.isLastWeeks()) year_left=year_left.substring(0, 4);

    if(!is_single_mode) {

      var year_right=ui_config.getYear('right');
      if(ui_config.isLastWeeks()) year_right=year_right.substring(0, 4);

    }

    var last_week_step=52;

    if(ui_config.isInterval()) last_week_step=26;
    if(ui_config.isLastWeeks()) last_week_step=52-ui_config.last_week;


    if((!ui_config.isInterval() && !ui_config.isLastWeeks()) || step<last_week_step ){

        if(year_left==='2000') year_left='All years';
        if(!is_single_mode && year_right==='2000') year_right='All years';

        $('#left_year_label').html(year_left);
        if(!is_single_mode) $('#right_year_label').html(year_right);

    }
    else{

      if(!ui_config.isInterval() && !ui_config.isLastWeeks()){

          if(year_left==='2000') year_left='All years';
          if(!is_single_mode && year_right==='2000') year_right='All years';


          $('#left_year_label').html(year_left);
          if(!is_single_mode) $('#right_year_label').html(year_right);

      }
      else{

        if(ui_config.getYear(position)!=='2000') $('#left_year_label').html(parseInt(year_left)+1);

        if(!is_single_mode) if(ui_config.getYear('right')!=='2000') $('#right_year_label').html(parseInt(year_right)+1);

      }


    }


  }

function addLoader(layer) {


  layer.bind('error', function(err) {
      alert("some error occurred: " + err);
    });


  layer.bind('loading', function() {

      //loader.show() ;

    });


    layer.bind('load',  function() {

      //console.log('On load');

      if(!torque_player.isLoaded()){

        torque_player.setTorqueLayer(layer_unique);

      }
      else{

        torque_player.updateTorqueLayer(layer_unique);

      }

      if($('#updating_msg').is(":visible")) {
        ui_config.hideLoader();
        torque_player.setInit();

      }

    });

}




var torque_manager={

  named_maps:{
       meteo_basic:'new_ebp_basic_meteo',meteo_single:'ebp_meteo_single_map',basic:'new_ebp_basic',pheno:'ebp_single',
       dummy:'new_ebp_dummy',meteo_traces:'new_ebp_traces_meteo',pheno_traces:'new_ebp_traces_unique',
       pheno_meteo:'new_ebp_meteo_unique',traces_right:'new_ebp_traces_right',
       traces_left:'new_ebp_traces_left',traces_both:'new_ebp_traces_both'
     },
  layers_nulls:{m:0,p:9,r:9,q:10},
  pos_values:{
      's_1_z5':0,'dc_1_z5':1,'df_1_z5':2,'dc_15_z5':3,'df_15_z5':4,
        's_1_z4':5, 's_1_z6':6, 's_1_z7':7,
        'dc_1_z6':8, 'df_1_z6':9, 'dc_15_z4':10, 'df_15_z4':11
    },
    w_values:{
      'cro':{'value':[2/**/,3,2,4,2.5/**/,1.2,3,5/**/,5,3.5,2.5,1.5]},
      'counts':{'<63':[0.75/**/,1.2,1,2,1.25/**/,0.5,1.25,2.25/**/,2.25,1.5,1,1],
                '_63':[2/**/,2.5, 2,4,2.5/**/,1.2,3, 5/**/,5,3.5, 2.5,1.25],
                '_64':[2.25/**/,3.4,2.25,6,3.75/**/,1.5,3.75,6.8/**/,6.75,4.5,3,1.9],
                '_65':[3.4/**/,5,3.4,9,5.6/**/,2.25,5.6,10.1/**/,10,6.8,4.5,2.8],
                '_66':[4.5/**/,6.8,4.5,12,7.5/**/,3,7.5,13.5/**/,13.5,9,6,3.8],
                '_97':[0.4/**/,0.4, 0.4,0.5,0.4/**/,0.3,0.5,0.7/**/,0.6, 0.5,0.4, 0.3]},
      'traces':{'_10':[0.75/**/,1.2,1,2,1.25/**/,0.5,1.25,2.25/**/,2.25,1.5,1,1],
                  '_11':[0.4/**/,0.4, 0.4, 0.5,0.4/**/,0.3, 0.5,0.7/**/,0.6, 0.5, 0.4, 0.3],
                '_10_f1':[3/**/,4.5,3,8,5/**/,2,5,9/**/,9,6,4,2.5],
                '_10_f2':[6/**/,9,6,16,10/**/,4,10,18/**/,18,12,8,5]},
      'occurrence':{'_10':[2/**/,3, 2,4,2.5/**/,1.2, 3,5/**/,5,3.5, 2.5,1.5],
                    '_11':[0.4/**/,0.4,0.4, 0.5,0.4/**/,0.3, 0.5,0.7/**/,0.6,0.5, 0.4,0.3]}
  },
  trans_base:{
    "double_c_1x":"dc_1",
    "double_f_1x":"df_1",
    "double_c_15x":"dc_15",
    "double_f_15x":"df_15",
    "unique":"s_1"
  },
  map_config:{

        map_name:'', params:{}

  },
  getxy30x30: function(){

    var base_type=layer_config.getSelectedBase();
    return base_type;

  },

  getSQL: function(map_type){

    return this.sql[map_type].replace(/xy30x30/g, this.getxy30x30());

  },
  getMarkerSize: function(map_type, value,base_type){

    return this.w_values[map_type][value][this.pos_values[base_type]];

  },
  getBaseTorque: function(){

    var base_torque=["Map {",
            "  -torque-frame-count: 52;",
            "  -torque-animation-duration: "+duration+";",
            "  -torque-time-attribute: \"week2\";",
            "  -torque-aggregation-function: \"max(valor)\";",
            "  -torque-resolution: 1;",
            "  -torque-data-aggregation: linear;",
            "}",
            "#layer{ ",
            "  marker-opacity: 1; ",
            "  marker-line-color: #FFFFFF; ",
            "  marker-line-width: 0; ",
            "  marker-line-opacity: 0; ",
            "  marker-type: rectangle; "];

    return base_torque.join('\n');


  },
  getCSSCro: function(base_type){

      var cro=[ " [value >= 1] [value <= 9] { marker-fill-opacity:1; marker-width: "+this.getMarkerSize('cro','value',base_type)+"; marker-type: rectangle;  }",
                "	[value = 1] { marker-fill: #FFFFCC; } ", "  	[value = 2] { marker-fill: #FFEDA0; } ",
                "	[value = 3] { marker-fill: #FED976; } ", " 	[value = 4] { marker-fill: #FEB24C; } ",
                "	[value = 5] { marker-fill: #FD8D3C; }  ", "	[value = 6] { marker-fill: #FC4E2A; } ",
                "	[value = 7] { marker-fill: #E31A1C; } ", " [value = 8] { marker-fill: #B10026; } ",
                "	[value = 9] { marker-fill: #860f28; } ", " [value=70] { marker-fill: #2d2e39; marker-fill-opacity:1; marker-width: "+this.getMarkerSize('cro','value',base_type)+"; marker-type: rectangle;  } "];

    return cro.join('\n');

  },
  getCSSMeteo: function(base_type){

    var colors={
      t:{
        35:'#7A0000',34:'#F60000',33:'#FF4400',32:'#FF7C00',31:'#FFCC00',
        30:'#F0FF05',29:'#B2FF1A',28:'#57FF38',27:'#36FF5D',26:'#19FFB3',
        25:'#03FFF6',24:'#01ACFF',23:'#0146FF',22:'#0B0BEA',21:'#2F2FA3',
        20:'#BBBBD2'
      },
      p:{
        55:'#2E419D',54:'#2662AF',53:'#1C8AC3',52:'#14AAD3',51:'#0CCDE6',
        50:'#05E9F4',49:'#01FFB9',48:'#01FF58',47:'#62FF00',46:'#FEF400',
        45:'#FDCA00',44:'#FB9900',43:'#FA6F00',42:'#EE7C30',41:'#DD9E74',
        40:'#CFBAAD'
      }
  };


    var meteo=[" [value >= 12] [value <= 54]{ marker-fill-opacity: 1; marker-width: "+this.getMarkerSize('cro','value',base_type)+";   marker-type: rectangle;  }",
    "  [value = 12]{ marker-fill: #383b8a; } ","  [value = 13]{ marker-fill: #031bf9; } ",
    "  [value = 14]{ marker-fill: #0dc8de; } ","  [value = 15]{ marker-fill: #26ff8c; } ",
    "  [value = 16]{ marker-fill: #cffe2a; } ","  [value = 17]{ marker-fill: #fff600; } ",
    "  [value = 18]{ marker-fill: #ff7507; } ","  [value = 19]{ marker-fill: #ff110e; } ",
    "  [value = 20]{ marker-fill: "+colors.t['20']+"; } ","  [value = 21]{ marker-fill: "+colors.t['21']+"; } ",
    "  [value = 22]{ marker-fill: "+colors.t['22']+"; } ","  [value = 23]{ marker-fill: "+colors.t['23']+"; } ",
    "  [value = 24]{ marker-fill: "+colors.t['24']+"; } ","  [value = 25]{ marker-fill: "+colors.t['25']+"; } ",
    "  [value = 26]{ marker-fill: "+colors.t['26']+"; } ","  [value = 27]{ marker-fill: "+colors.t['27']+"; } ",
    "  [value = 28]{ marker-fill: "+colors.t['28']+"; } ","  [value = 29]{ marker-fill: "+colors.t['29']+"; } ",
    "  [value = 30]{ marker-fill: "+colors.t['30']+"; } ","  [value = 31]{ marker-fill: "+colors.t['31']+"; } ",
    "  [value = 32]{ marker-fill: "+colors.t['32']+"; } ","  [value = 33]{ marker-fill: "+colors.t['33']+"; } ",
    "  [value = 34]{ marker-fill: "+colors.t['34']+"; } ","  [value = 35]{ marker-fill: "+colors.t['35']+"; } ",
    "  [value = 55]{ marker-fill: "+colors.p['55']+"; } ","  [value = 54]{ marker-fill: "+colors.p['54']+"; } ",
    "  [value = 53]{ marker-fill: "+colors.p['53']+"; } ","  [value = 52]{ marker-fill: "+colors.p['52']+"; } ",
    "  [value = 51]{ marker-fill: "+colors.p['51']+"; } ","  [value = 50]{ marker-fill: "+colors.p['50']+"; } ",
    "  [value = 49]{ marker-fill: "+colors.p['49']+"; } ","  [value = 48]{ marker-fill: "+colors.p['48']+"; } ",
    "  [value = 47]{ marker-fill: "+colors.p['47']+"; } ","  [value = 46]{ marker-fill: "+colors.p['46']+"; } ",
    "  [value = 45]{ marker-fill: "+colors.p['45']+"; } ","  [value = 44]{ marker-fill: "+colors.p['44']+"; } ",
    "  [value = 43]{ marker-fill: "+colors.p['43']+"; } ","  [value = 42]{ marker-fill: "+colors.p['42']+"; } ",
    "  [value = 41]{ marker-fill: "+colors.p['41']+"; } ","  [value = 40]{ marker-fill: "+colors.p['40']+"; } "];

    return meteo.join('\n');

  },
  getCSSMeteoZoom: function(base_type){

    if(base_type==='s_1_z5'){

          var meteo_zoom=["#layer [zoom = 4][value >= 12] [value <= 54]{",
            "  marker-width: "+this.getMarkerSize('cro','value','s_1_z4')+";","}",
            "#layer [zoom = 6] [value >= 12] [value <= 54] {",
            "  marker-width: "+this.getMarkerSize('cro','value','s_1_z6')+";","}",
            "#layer [zoom = 7] [value >= 12] [value <= 54] {",
            "  marker-width: "+this.getMarkerSize('cro','value','s_1_z7')+";","}"

          ];

          return meteo_zoom.join('\n');

    }
    else return '';

  },
  getCSSCroZoom: function(base_type){

    if(base_type==='s_1_z5'){

          var cro_zoom=["#layer [zoom = 4][value >= 1] [value <= 9] {",
            "  marker-width: "+this.getMarkerSize('cro','value','s_1_z4')+";","}",
            "#layer [zoom = 6][value >= 1] [value <= 9] {",
            "  marker-width: "+this.getMarkerSize('cro','value','s_1_z6')+";","}",
            "#layer [zoom = 7][value >= 1] [value <= 9] {",
            "  marker-width: "+this.getMarkerSize('cro','value','s_1_z7')+";","}",
            "#layer [zoom = 4][value = 70] {",
              "  marker-width: "+this.getMarkerSize('cro','value','s_1_z4')+";","}",
              "#layer [zoom = 6][value = 70] {",
              "  marker-width: "+this.getMarkerSize('cro','value','s_1_z6')+";","}",
              "#layer [zoom = 7][value = 70] {",
              "  marker-width: "+this.getMarkerSize('cro','value','s_1_z7')+";","}"
          ];

          return cro_zoom.join('\n');

    }
    else return '';


  },
  getCssCounts: function(base_type){

    var count =[
        "  [value >= 60][value <=66]{ marker-fill-opacity: 0.8; " ,
        "  marker-type: ellipse; }",
        "  [value = 60] { marker-width: "+this.getMarkerSize('counts','<63',base_type)+"; } ",
        "  [value = 60]  { marker-fill-opacity: 0.5; } ",
        "  [value = 60] { marker-fill: #eeeeee; } ",
        "  [value = 61] { marker-width: "+this.getMarkerSize('counts','<63',base_type)+"; } ",
        "  [value = 61]  { marker-fill-opacity: 0.5; } ",
        "  [value = 61] { marker-fill: #eeeeee; } ",
        "  [value = 62] { marker-width: "+this.getMarkerSize('counts','<63',base_type)+"; } ",
        "  [value = 62]  { marker-fill-opacity: 0.5; } ",
        "  [value = 62] { marker-fill: #eeeeee; } ",
        "  [value = 63]{ marker-width: "+this.getMarkerSize('counts','_63',base_type)+"; } ", "  [value = 63]{ marker-fill: #7fcdbb;  } ",
        "  [value = 64]{ marker-width: "+this.getMarkerSize('counts','_64',base_type)+"; } ", "  [value = 64]{ marker-fill: #41b6c4;  } ",
        "  [value = 65]{ marker-width: "+this.getMarkerSize('counts','_65',base_type)+"; } ", "  [value = 65]{ marker-fill: #1d91c0;  } ",
        "  [value = 66]{ marker-width: "+this.getMarkerSize('counts','_66',base_type)+"; } ", "  [value = 66]{ marker-fill: #225ea8;  } ",
        "  [value = 97]{ marker-width: "+this.getMarkerSize('counts','_97',base_type)+"; } ", "  [value = 97]{ marker-type: rectangle; } ",
        "  [value = 97]{ marker-fill: #cccccc; } ", "  [value = 97]{ marker-fill-opacity: 0.5; } "];

    return count.join('\n');

  },
  getCssCountsZoom: function(base_type){

    if(base_type==='s_1_z5'){

          var counts_zoom=[
            "#layer [value< 63][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('counts','<63','s_1_z4')+";",
            "}",
            "#layer [value=63][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('counts','_63','s_1_z4')+";",
            "}",
            "#layer [value=64][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('counts','_64','s_1_z4')+";",
            "}",
            "#layer [value=65][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('counts','_65','s_1_z4')+";",
            "}",
            "#layer [value=66][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('counts','_66','s_1_z4')+";",
            "}",
            "#layer [value=97][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('counts','_97','s_1_z4')+";",
            "}",
            "#layer [value< 63][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('counts','<63','s_1_z6')+";",
            "}",
            "#layer [value=63][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('counts','_63','s_1_z6')+";",
            "}",
            "#layer [value=64][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('counts','_64','s_1_z6')+";",
            "}",
            "#layer [value=65][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('counts','_65','s_1_z6')+";",
            "}",
            "#layer [value=66][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('counts','_66','s_1_z6')+";",
            "}",
            "#layer [value=97][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('counts','_97','s_1_z6')+";",
            "}",
            "#layer [value< 63][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('counts','<63','s_1_z7')+";",
            "}",
            "#layer [value=63][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('counts','_63','s_1_z7')+";",
            "}",
            "#layer [value=64][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('counts','_64','s_1_z7')+";",
            "}",
            "#layer [value=65][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('counts','_65','s_1_z7')+";",
            "}",
            "#layer [value=66][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('counts','_66','s_1_z7')+";",
            "}",
            "#layer [value=97][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('counts','_97','s_1_z7')+";",
            "}",

          ];

          return counts_zoom.join('\n');

    }
    else return '';


  },
  getCssOccurrence: function(base_type){

    var occurrence =[
      "  [value = 10]{ marker-width: "+this.getMarkerSize('occurrence','_10',base_type)+"; } ",
      "  [value = 10]{ marker-fill: #ff087b; } ",
      "  [value = 10]{ marker-fill-opacity: 1; } ",
      "  [value = 11]{ marker-width: "+this.getMarkerSize('occurrence','_11',base_type)+"; } ",
      "  [value = 11]{ marker-fill: #cccccc; } ",
      "  [value = 11]{ marker-fill-opacity: 0.6; } "];

    return occurrence.join('\n');

  },
  getCssOccurrenceZoom: function(base_type){

    if(base_type==='s_1_z5'){

          var cro_zoom=["#layer [zoom = 4][value=10] {",
            "  marker-width: "+this.getMarkerSize('occurrence','_10','s_1_z4')+";",
            "}",
            "#layer [zoom = 4][value=11] {",
            "  marker-width: "+this.getMarkerSize('occurrence','_11','s_1_z4')+";",
            "}",
            "#layer [zoom = 6][value=10] {",
            "  marker-width: "+this.getMarkerSize('occurrence','_10','s_1_z6')+";",
            "}",
            "#layer [zoom = 6][value=11] {",
            "  marker-width: "+this.getMarkerSize('occurrence','_11','s_1_z6')+";",
            "}",
            "#layer [zoom = 7][value=10] {",
            "  marker-width: "+this.getMarkerSize('occurrence','_10','s_1_z7')+";",
            "}",
            "#layer [zoom = 7][value=11] {",
            "  marker-width: "+this.getMarkerSize('occurrence','_11','s_1_z7')+";",
            "}"
          ];

          return cro_zoom.join('\n');

    }
    else return '';

  },
  getCssRecords: function(base_type){

    var records=[
      "  marker-line-width: 0;",
      "  marker-line-color: #FFFFFF;", "  marker-line-opacity: 0;",
      "  [value = 98]{ marker-width: "+this.getMarkerSize('traces','_11',base_type)+"; } ", "  [value = 98]{ marker-type: rectangle; } ",
      "  [value = 98]{ marker-fill: #cccccc; } ", "  [value = 98]{ marker-fill-opacity: 0.6; } ",
      "  [value = 99]{ marker-width: "+this.getMarkerSize('traces','_10',base_type)+"; } ", "  [value = 99]{ marker-opacity: 1; } ",
      "  [value = 99]{ marker-line-opacity: 0.9; }", "  [value = 99]{ marker-line-color: #FFF; } ",
      "  [value = 99]{ marker-line-width: 0; } ", "  [value = 99]{ marker-type: ellipse; } ",
      "  [value = 99]{ marker-fill: #fc4e2a; } ", "  [value = 99]{ marker-fill-opacity: 0.9; } "
      ];

      return records.join('\n');

  },
  getCssRecordsZoom: function(base_type){

    if(base_type==='s_1_z5'){

          var cro_zoom=[
            "#layer [value=99][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('traces','_10','s_1_z4')+";",
            "}",
            "#layer [value=98][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('traces','_11','s_1_z4')+";",
            "}",
            "#layer [frame-offset=1] [value=99][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('traces','_10_f1','s_1_z4')+";",
            "}",
            "#layer [frame-offset=2] [value=99][zoom = 4] {",
            "  marker-width: "+this.getMarkerSize('traces','_10_f2','s_1_z4')+";",
            "}",
            "#layer [frame-offset=1][zoom = 4] {",
            "  marker-width: 0;",
            "}",
            "#layer [frame-offset=2][zoom = 4] {",
            "  marker-width: 0;",
            "}",
            "#layer [value=99][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('traces','_10','s_1_z6')+";",
            "}",
            "#layer [value=98][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('traces','_11','s_1_z6')+";",
            "}",
            "#layer [frame-offset=1] [value=99][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('traces','_10_f1','s_1_z6')+";",
            "}",
            "#layer [frame-offset=2] [value=99][zoom = 6] {",
            "  marker-width: "+this.getMarkerSize('traces','_10_f2','s_1_z6')+";",
            "}",
            "#layer [frame-offset=1][zoom = 6] {",
            "  marker-width: 0;",
            "}",
            "#layer [frame-offset=2][zoom = 6] {",
            "  marker-width: 0;",
            "}",
            "#layer [value=99][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('traces','_10','s_1_z7')+";",
            "}",
            "#layer [value=98][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('traces','_11','s_1_z7')+";",
            "}",
            "#layer [frame-offset=1] [value=99][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('traces','_10_f1','s_1_z7')+";",
            "}",
            "#layer [frame-offset=2] [value=99][zoom = 7] {",
            "  marker-width: "+this.getMarkerSize('traces','_10_f2','s_1_z7')+";",
            "}",
            "#layer [frame-offset=1][zoom = 7] {",
            "  marker-width: 0;",
            "}",
            "#layer [frame-offset=2][zoom = 7] {",
            "  marker-width: 0;",
            "}"
          ];

          return cro_zoom.join('\n');

    }
    else return '';

  },
  getCssRecordsExtra: function(base_type){

    var records_extra=[
      "#layer[frame-offset=1] [value=99] {",
      "  marker-width: "+this.getMarkerSize('traces','_10_f1',base_type)+";", "  marker-fill: #fc4e2a;",
      "  marker-fill-opacity: 0.3;", "  marker-line-width: 0; ",
      "  marker-opacity:0.3; ", "}",
      "#layer[frame-offset=2] [value=99] {",
      "  marker-width: "+this.getMarkerSize('traces','_10_f2',base_type)+";", "  marker-fill: #fc4e2a;",
      "  marker-fill-opacity: 0.1;", "  marker-line-width: 0; ",
      "  marker-opacity:0.1; ", "}",
      "#layer[frame-offset=1] {",
      "  marker-width: 0;","}",
      "#layer[frame-offset=2] {",
      "  marker-width: 0;", "}",
    ];

    return records_extra.join('\n');

  },
  getCSSPhenology: function(base_type){

    var phenology=[
      "  marker-type: rectangle;", "  marker-line-width: 0;",
      "  marker-line-color: #FFFFFF;", "  marker-line-opacity: 0;"
    ];

    return phenology.join('\n');

  },
  getCSS: function(map_type,zoom){


    if(map_type==='s_1') zoom=5;
    var base_type=map_type+'_z'+zoom;
    //var base_type=this.getxy30x30()+'_z'+zoom;

    var main_sql=this.getBaseTorque();
    extra_zoom='';

    if(ui_config.hasModel()) {

      main_sql=main_sql+this.getCSSCro(base_type);
      extra_zoom=extra_zoom+this.getCSSCroZoom(base_type);

    }
    if(ui_config.hasOccurrence()) {

      main_sql=main_sql+this.getCssOccurrence(base_type);
      extra_zoom=extra_zoom+this.getCssOccurrenceZoom(base_type);

    }
    //Meteo
    if(ui_config.hasMeteo('right')){

      main_sql=main_sql+this.getCSSMeteo(base_type);
      extra_zoom=extra_zoom+this.getCSSMeteoZoom(base_type);

    }
    if(ui_config.hasCounts()) {

      main_sql=main_sql+this.getCssCounts(base_type);
      extra_zoom=extra_zoom+this.getCssCountsZoom(base_type);

    }

    if(ui_config.hasRecord()){

      main_sql=main_sql+this.getCssRecords(base_type);

    }

    if(ui_config.isPhenology()) main_sql=main_sql+this.getCSSPhenology(base_type);

    main_sql=main_sql+'\n}\n'+extra_zoom+'\n';

    if(ui_config.hasRecord()) main_sql=main_sql+'\n'+this.getCssRecordsExtra(base_type)+'\n'+this.getCssRecordsZoom(base_type);


    return main_sql;

  },
  getNamedMap: function(){

    if(ui_config.hasMeteo('right') && ui_config.isDoubleMode()){

        this.getMeteoMapConfig();

    }
    else if(ui_config.hasPhenology()){

        this.getPhenologyMapConfig();

    }
    else {

        this.getMainMapConfig();
    }

   //console.log(this.map_config);
   return this.map_config;


 },
  getMainMapConfig: function(){


    if(ui_config.isSingleMode()){

       if(ui_config.isRecord('unique')){


         this.map_config.map_name=this.named_maps.pheno_traces;
        this.map_config.params= {

               "species": ui_config.getSpecies('unique'),
               "year":  ui_config.getYear('unique'),
               "side":  "l",
               "xy_ref":this.getxy30x30()
             };


       }
       else if(ui_config.hasMeteo('unique')){

         this.map_config.map_name=this.named_maps.meteo_single;
         this.map_config.params= {

                     "meteo": ui_config.getSpecies('unique'),
                     "year":  "_"+ui_config.getYear('unique'),
                     "xy_ref":this.getxy30x30()

               };

       }
       else if(ui_config.isPhenologyPos('unique')){

         this.map_config.map_name=this.named_maps.dummy;
         this.map_config.params= {};

       }
       else{


         this.map_config.map_name=this.named_maps.pheno;
            this.map_config.params= {

               "species": ui_config.getSpecies('unique'),
               "year":  ui_config.getYear('unique'),
               "side":  "l",
               "map": ui_config.getType('unique'),
               "xy_ref":this.getxy30x30(),
               "empty": this.layers_nulls[ui_config.getType('unique')],
               "right_pos": 100000

         };


       }


    }
    else if(ui_config.isRecord('left') || ui_config.isRecord('right') ){

        if(ui_config.isRecordBoth()){

                this.map_config.map_name=this.named_maps.traces_both;
            this.map_config.params= {

                    "species_l": ui_config.getSpecies('left'),
                    "species_r":  ui_config.getSpecies('right'),
                    "year_l":  ui_config.getYear('left'),
                    "year_r": ui_config.getYear('right'),
                    "xy_ref":this.getxy30x30(),
                    "right_pos": 100000

                };

        }
        else if (ui_config.isRecord('right')) {



            this.map_config.map_name=this.named_maps.traces_right;
            this.map_config.params= {

                    "species_l": ui_config.getSpecies('left'),
                    "map_l": ui_config.getType('left'),
                    "year_l":  ui_config.getYear('left'),
                    "empty_l": this.layers_nulls[ui_config.getType('left')],
                    "species_r":  ui_config.getSpecies('right'),
                    "year_r": ui_config.getYear('right'),
                    "xy_ref":this.getxy30x30(),
                    "right_pos": 100000

                };


        } else{

            this.map_config.map_name=this.named_maps.traces_left;
            this.map_config.params= {

                    "species_l": ui_config.getSpecies('left'),
                    "species_r":  ui_config.getSpecies('right'),
                    "year_l":  ui_config.getYear('left'),
                    "year_r": ui_config.getYear('right'),
                    "map_r": ui_config.getType('right'),
                    "empty_r": this.layers_nulls[ui_config.getType('right')],
                    "xy_ref":this.getxy30x30(),
                    "right_pos": 100000


                };

       }



      }
      else{



              this.map_config.map_name=this.named_maps.basic;
              this.map_config.params= {

                   "species_l": ui_config.getSpecies('left'),
                   "map_l": ui_config.getType('left'),
                   "year_l":  ui_config.getYear('left'),
                   "empty_l": this.layers_nulls[ui_config.getType('left')],
                   "species_r":  ui_config.getSpecies('right'),
                   "map_r": ui_config.getType('right'),
                   "year_r": ui_config.getYear('right'),
                   "empty_r": this.layers_nulls[ui_config.getType('right')],
                   "xy_ref": this.getxy30x30(),
                   "right_pos": 100000


               };





      }


  },
  getMeteoMapConfig:function(){

      if(ui_config.isRecord('left')){

          this.map_config.map_name=this.named_maps.meteo_traces;
          this.map_config.params= {

                      "species_l": ui_config.getSpecies('left'),
                      "year_l":  ui_config.getYear('left'),
                      "meteo_r":  ui_config.getSpecies('right'),
                      "year_r": "_"+ui_config.getYear('right'),
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000


                };

      }
      else if(ui_config.isPhenologyPos('left')){

          this.map_config.map_name=this.named_maps.pheno_meteo;
          this.map_config.params= {

                      "meteo": ui_config.getSpecies('right'),
                      "year":  "_"+ui_config.getYear('right'),
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000


                };


      }
      else{

          this.map_config.map_name=this.named_maps.meteo_basic;
            this.map_config.params= {

                      "species_l": ui_config.getSpecies('left'),
                      "map_l": ui_config.getType('left'),
                      "year_l":  ui_config.getYear('left'),
                      "empty_l": this.layers_nulls[ui_config.getType('left')],
                      "meteo_r":  ui_config.getSpecies('right'),
                      "year_r": "_"+ui_config.getYear('right'),
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000


                };

      }


  },
  getPhenologyMapConfig:function(){

    if(ui_config.isPhenology()){

        this.map_config.map_name=this.named_maps.dummy;
        this.map_config.params= {};

    }
    else if(ui_config.isPhenologyPos('left')){

            if(ui_config.isRecord('right'))  {

                this.map_config.map_name=this.named_maps.pheno_traces;
               this.map_config.params= {

                      "species": ui_config.getSpecies('right'),
                      "year":  ui_config.getYear('right'),
                      "side":  "r",
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000



                };
            }
            else{

                this.map_config.map_name=this.named_maps.pheno;
                this.map_config.params= {

                      "species": ui_config.getSpecies('right'),
                      "map": ui_config.getType('right'),
                      "year":  ui_config.getYear('right'),
                      "empty": this.layers_nulls[ui_config.getType('right')],
                      "side":  "r",
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000



                };

            }



    }
    else{

            if(ui_config.isRecord('left')) {

                this.map_config.map_name=this.named_maps.pheno_traces;
                   this.map_config.params= {

                      "species": ui_config.getSpecies('left'),
                      "year":  ui_config.getYear('left'),
                      "side":  "l",
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000



                };
            }
            else{

                this.map_config.map_name=this.named_maps.pheno;
                       this.map_config.params= {

                      "species": ui_config.getSpecies('left'),
                      "map": ui_config.getType('left'),
                      "year":  ui_config.getYear('left'),
                      "empty": this.layers_nulls[ui_config.getType('left')],
                      "side":  "l",
                      "xy_ref":this.getxy30x30(),
                      "right_pos": 100000



                };

            }

    }


}

};


var layer_config={

  state:{
    'double': {'base':'','zoom':5},
    'unique': {'base':'','zoom':6,'zoom_max':7,'zoom_min':5},
    'config':{
      'prev_base':'','prev_mode':'','mode':'double',
      'map_type':{'left':'','right':'','unique':''}
    },
  },
  base_layers:{
      's_1':{
        'center':[8.5,14.7177296309],
        'bounds':[-12,-7,27,37]
      }
  },
  cache:{
    'left':{},
    'right':{},
    'unique':{}
  },
  trans_pos:{
    'left':'_l','right':'_r','unique':''
  },
  getCurrent: function(property){

    return this.state[this.state.config['mode']][property];

  },
  setCurrent: function(property,value){

    this.state[this.state.config['mode']][property]=value;

  },
  loadCurrentConfig:function(position){

    return this.base_layers[position][this.state[position]['base']][this.state[position]['map']];

  },
  getSelectedBase:function(){

    return this.getCurrent('base');

  },
  initUniqueBase: function(){

    this.state['config']['mode']='unique';

  },
  setUniqueBase: function(zoom){


    //initial config
    if(this.getCurrent('base')==='') this.setInitConfig();

    /* Backup previous state */
    this.state['config']['prev_mode']=this.state['config']['mode'];
    this.state['config']['prev_base']=this.getCurrent('base');
    this.state['config']['mode']='unique';


    this.setCurrent('base','s_1');
    if(zoom) this.setCurrent('zoom',zoom);


    this.loadBaseLayer();

  },
  changeBaseLayer: function(map_type,zoom,mode){

    this.state['config']['prev_base']=this.getCurrent('base');
    this.state['config']['prev_mode']=this.state['config']['mode'];

    this.state['config']['mode']=mode;


    this.setCurrent('zoom',parseInt(zoom));
    this.setCurrent('base',map_type);


    this.loadBaseLayer();

  },
  getTableName: function(layer,map_type,position){

    //console.log('ebp_'+layer+'_'+map_type+position);
    return 'ebp_'+layer+'_'+map_type+position;

  },
  updateBaseStyle: function(map_type, position){

    if(this.state['config']['map_type']!==map_type){

      this.cache[position][this.getCurrent('base')]['base']['not_sea'].setZIndex(this.getNotSeaPosition(map_type,position));


        this.cache[position][this.getCurrent('base')]['base']['sea'].setZIndex(this.getSeaPosition(map_type,position));

        this.cache[position][this.getCurrent('base')]['base']['borders'].setZIndex(this.getBordersPosition(map_type,position));
        this.cache[position][this.getCurrent('base')]['base']['borders'].getSubLayer(0).setCartoCSS(this.getBordersStyle(map_type));

        this.cache[position][this.getCurrent('base')]['base']['estudi'].getSubLayer(0).setCartoCSS('#layer {   polygon-fill: '+this.getEstudiColor(map_type)+'; polygon-opacity: 1; line-width: 0; line-color: #6e6e6e; line-opacity: 0.7; }');
        this.cache[position][this.getCurrent('base')]['base']['estudi'].setZIndex(this.getEstudiPosition(map_type,position));


        this.cache[position][this.getCurrent('base')]['base']['base'].setZIndex(this.getBasePosition(map_type,position));


        //if(map_type==='p') this.cache[position][this.getCurrent('base')]['base']['borders'].show();
        //else this.cache[position][this.getCurrent('base')]['base']['borders'].hide();

    }


  },
  setInitConfig: function(){

    var screen_width=$( window ).width();

    if(screen_width >= 2404){
      this.state.double['base']='dc_1';
      this.state.double['zoom']=6;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=7;
      this.state.unique['zoom_max']=7;
      this.state.unique['zoom_min']=5;

    }

    else if(screen_width >= 1804){
      this.state.double['base']='dc_15';
      this.state.double['zoom']=5;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=6;
      this.state.unique['zoom_max']=7;
      this.state.unique['zoom_min']=5;

    }
    else if(screen_width >= 1202){

      this.state.double['base']='dc_1';
      this.state.double['zoom']=5;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=6;
      this.state.unique['zoom_max']=7;
      this.state.unique['zoom_min']=5;


    }
    else if(screen_width >= 902){

      this.state.double['base']='dc_15';
      this.state.double['zoom']=4;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=6;
      this.state.unique['zoom_max']=7;
      this.state.unique['zoom_min']=5;
    }
    /* TODO: a veure */
    else if(screen_width >= 700){

      this.state.double['base']='dc_15';
      this.state.double['zoom']=4;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=6;
      this.state.unique['zoom_max']=7;
      this.state.unique['zoom_min']=5;

    }
    else if(screen_width >= 320){

      this.state.double['base']='dc_1';
      this.state.double['zoom']=4;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=5;
      this.state.unique['zoom_max']=6;
      this.state.unique['zoom_min']=5;

      this.state['config']['mode']='unique';
    }
    else{

      this.state.double['base']='dc_1';
      this.state.double['zoom']=4;

      this.state.unique['base']='s_1';
      this.state.unique['zoom']=4;
      this.state.unique['zoom_max']=6;
      this.state.unique['zoom_min']=4;

      this.state['config']['mode']='unique';

    }

    //console.log(screen_width);
    //console.log(this.state);


  },
  loadBaseLayer: function(){

    //initial config
    if(this.getCurrent('base')==='') this.setInitConfig();

    var zoom=this.getCurrent('zoom');
    var center=this.base_layers[this.getCurrent('base')]['center'];
    var bounds=this.base_layers[this.getCurrent('base')]['bounds'];

    map.setMaxBounds(L.latLngBounds(L.latLng(bounds[0],bounds[1]), L.latLng(bounds[2], bounds[3])));
    map.setView(center, zoom);

    layer_config.hideCached();


    if(this.state['config']['mode']==='unique'){

      this.loadBaseLayerPos('unique',ui_config.getType('unique'));

    }
    else{


//    console.log(ui_config.getType('left'));
//    console.log(ui_config.getType('right'));

      this.loadBaseLayerPos('left',ui_config.getType('left'));
      this.loadBaseLayerPos('right',ui_config.getType('right'));

    }

  },
  getEstudiColor: function(map_type){

    if(map_type==='m') return '#ffffeb';
    else return '#1a1a20';

  },
  getNotSeaPosition: function(map_type,position){

    var z_index=-5;

    if(position==='right') z_index=z_index+1;

    return z_index;

  },

  getBordersStyle: function(map_type,position){


      if(map_type==='m' || map_type==='t' ||  map_type==='p') {

        return '#layer {   line-width: 0.8; line-color: #6e6e6e; line-opacity: 0.4;  }';
      }
      else {
        return '#layer {   line-width: 0.8; line-color: #cccccc; line-opacity: 0.1;  }';

      }

  },
  getSeaPosition: function(map_type,position){

    var z_index=-1;

    if(map_type==='m' || map_type==='t') z_index=45;
    if(position==='right') z_index=z_index+1;

    return z_index;

  },
  getEstudiPosition: function(map_type,position){

    var z_index=-1;

    if(map_type==='m' || map_type==='t' ||  map_type==='p') z_index=20;
    else z_index=10;
    if(position==='right') z_index=z_index+1;

    //console.log(z_index +" -> "+map_type+" "+position);
    return z_index;

  },
  getBordersPosition: function(map_type,position){

    var z_index=-1;

    if(map_type==='m' || map_type==='t' ||  map_type==='p') z_index=50;
    else z_index=20;
    if(position==='right') z_index=z_index+1;

    //console.log(z_index +" -> "+map_type+" "+position);
    return z_index;

  },
  getBasePosition: function(map_type,position){

    var z_index=-1;

    if(map_type==='m' || map_type==='t' /*||  map_type==='p'*/) z_index=40;
    else  z_index=20;

    if(position==='right') z_index=z_index+1;

    //console.log(z_index +" -> "+map_type+" "+position);
    return z_index;

  },
  createNestedObject: function( base, names, value ) {
      // If a value is given, remove the last name and keep it for later:
      var lastName = arguments.length === 3 ? names.pop() : false;

      // Walk the hierarchy, creating new objects where needed.
      // If the lastName was removed, then the last object is not set yet:
      for( var i = 0; i < names.length; i++ ) {
          base = base[ names[i] ] = base[ names[i] ] || {};
      }

      // If a value was given, set it to the last name:
      if( lastName ) base = base[ lastName ] = value;

      // Return the last object in the hierarchy:
      return base;
  },
  checkNested: function(obj /*, level1, level2, ... levelN*/) {
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < args.length; i++) {
      if (!obj || !obj.hasOwnProperty(args[i])) {
        return false;
      }
      obj = obj[args[i]];
    }
    return true;
  },
  isCached: function(position,base,mode){

    return this.checkNested(this.cache[position], base, mode);

  },
  showCached: function(position,base,map_type){

    this.cache[position][base][mode]['not_sea'].show();
    this.cache[position][base][mode]['sea'].show();
    this.cache[position][base][mode]['borders'].show();
    this.cache[position][base][mode]['base'].show();

    if(map_type==='p') this.cache[position][base][mode]['estudi'].show();
    else this.cache[position][base][mode]['estudi'].hide();


  },
  hideCached:function(){

    if(this.state['config']['prev_base']!==''){

      if(this.state['config']['prev_mode']==='unique' && this.state['config']['mode']=='double' ){

        this.cache['unique'][this.state['config']['prev_base']]['base']['not_sea'].hide();
        this.cache['unique'][this.state['config']['prev_base']]['base']['sea'].hide();
        this.cache['unique'][this.state['config']['prev_base']]['base']['borders'].hide();
        this.cache['unique'][this.state['config']['prev_base']]['base']['borders'].hide();
        this.cache['unique'][this.state['config']['prev_base']]['base']['estudi'].hide();
        this.cache['unique'][this.state['config']['prev_base']]['base']['base'].hide();

      }
      else{

        this.cache['left'][this.state['config']['prev_base']]['base']['not_sea'].hide();
        this.cache['left'][this.state['config']['prev_base']]['base']['sea'].hide();
        this.cache['left'][this.state['config']['prev_base']]['base']['borders'].hide();
        this.cache['left'][this.state['config']['prev_base']]['base']['estudi'].hide();
        this.cache['left'][this.state['config']['prev_base']]['base']['base'].hide();

        this.cache['right'][this.state['config']['prev_base']]['base']['not_sea'].hide();
        this.cache['right'][this.state['config']['prev_base']]['base']['sea'].hide();
        this.cache['right'][this.state['config']['prev_base']]['base']['borders'].hide();
        this.cache['right'][this.state['config']['prev_base']]['base']['estudi'].hide();
        this.cache['right'][this.state['config']['prev_base']]['base']['base'].hide();

      }



    }

  },
  setCached: function(layer,position,base,mode,order){

    this.createNestedObject( this.cache[position], [base, mode, order],layer );

  },
  loadBaseLayerPos: function(position,map_type){

    var base=this.getCurrent('base');
    //console.log('Loading '+base+' -> '+position);

    if(layer_config.isCached(position,base)){

      layer_config.showCached(position,base,map_type);
    }
    else{

        // create a layer with 1 sublayer
        cartodb.createLayer(map, {
          user_name: 'trials',
          type: 'cartodb',
          sublayers: [/*{
            sql: 'select * from '+this.getTableName('base',this.getCurrent('base'),this.trans_pos[position]),
            cartocss: '#layer { polygon-fill: #2f303e; polygon-opacity: 1;  line-width: 0; line-color: #2d2e39; line-opacity: 1; }'
          },*/
          {
            sql: 'select * from '+this.getTableName('world',this.getCurrent('base'),this.trans_pos[position]),
            cartocss: '#layer {   polygon-fill: #2f303e; polygon-opacity: 1;  }' },


          ]
        },{ https: true })
        .addTo(map) // add the layer to our map which already contains 1 sublayer
        .done(function(layer) {

          if(ui_config.isDebug()) console.log('Not sea '+position+' z-index: '+layer_config.getNotSeaPosition(map_type,position));
          layer.setZIndex(layer_config.getNotSeaPosition(map_type,position));
          layer_config.setCached(layer,position,base,'base','not_sea');

        });


        /* Països Rússia etc... */
        cartodb.createLayer(map, {
            user_name: 'trials',
            type: 'cartodb',
            sublayers: [
            {
              sql: 'select * from '+this.getTableName('base',this.getCurrent('base'),this.trans_pos[position]),
              cartocss: '#layer { polygon-fill: #2f303e; polygon-opacity: 1;   }'
            }
            ]
          })
          .addTo(map) // add the layer to our map which already contains 1 sublayer
          .done(function(layer) {

            if(ui_config.isDebug()) console.log('Base '+position+' z-index: '+layer_config.getBasePosition(map_type,position));
            layer.setZIndex(layer_config.getBasePosition(map_type,position));
            layer_config.setCached(layer,position,base,'base','base');


          },{ https: true });


                      cartodb.createLayer(map, {
                          user_name: 'trials',
                          type: 'cartodb',
                          sublayers: [
                          {
                            sql: 'select * from '+this.getTableName('estudi_p',this.getCurrent('base'),this.trans_pos[position]),
                            cartocss: '#layer {   polygon-fill: '+this.getEstudiColor(map_type)+'; polygon-opacity: 1; line-width: 0; line-color: #6e6e6e; line-opacity: 0.7; }'
                          }
                          ]
                        })
                        .addTo(map) // add the layer to our map which already contains 1 sublayer
                        .done(function(layer) {


                          if(ui_config.isDebug()) console.log('Estudi '+position+' z-index: '+layer_config.getEstudiPosition(map_type,position));

                          layer.setZIndex(layer_config.getEstudiPosition(map_type,position));
                          layer_config.setCached(layer,position,base,'base','estudi');


                        },{ https: true });

                       cartodb.createLayer(map, {
                          user_name: 'trials',
                          type: 'cartodb',
                          sublayers: [
                          {
                            sql: 'select * from '+this.getTableName('estudi_l',this.getCurrent('base'),this.trans_pos[position]),
                            cartocss: this.getBordersStyle(map_type,position)
                          }
                          ]
                        })
                        .addTo(map) // add the layer to our map which already contains 1 sublayer
                        .done(function(layer) {

                          layer.setZIndex(layer_config.getBordersPosition(map_type,position));
                          layer_config.setCached(layer,position,base,'base','borders');
                          if(ui_config.isDebug()) console.log('Borders '+position+' z-index: '+layer_config.getBordersPosition(map_type,position));


                        },{ https: true });


        cartodb.createLayer(map, {
          user_name: 'trials',
          type: 'cartodb',
          sublayers: [
          {
            sql: 'select * from '+this.getTableName('sea',this.getCurrent('base'),this.trans_pos[position]),
            cartocss: '#layer { polygon-fill: #3a3d4a; polygon-opacity: 1;  line-width: 0; }'
          }
          ]
        })
        .addTo(map) // add the layer to our map which already contains 1 sublayer
        .done(function(layer) {

          layer.setZIndex(layer_config.getSeaPosition(map_type,position));
          layer_config.setCached(layer,position,base,'base','sea');
          if(ui_config.isDebug()) console.log('Sea '+position+' z-index: '+layer_config.getSeaPosition(map_type,position));


        },{ https: true });


    }

  },
  addModelFilter: function(position){

    var base=this.getCurrent('base');

    if(layer_config.isCached(position,base)) layer_config.showCached(position,base,'low_resolution');

   var year=ui_config.getYear(position);
   var pos_r='r';

   if(ui_config.isInterval()) year=year+'_';

   if(position==='left') pos_r='l';

      //console.log('SELECT * FROM ebp_'+pos_r+'_lr_'+year);

      cartodb.createLayer(map, {
         user_name: 'trials',
         type: 'cartodb',
         sublayers: [{
           sql: 'SELECT * FROM ebp_'+pos_r+'_lr_'+year,
           cartocss: this.getModelFilterCSS()
         }]
       },{ https: true })
       .addTo(map) // add the layer to our map which already contains 1 sublayer
       .done(function(layer) {

          layer.setZIndex(2);
          base_layers.not_recorded_layers[pos].layer=layer;
          base_layers.not_recorded_layers[pos].active=true;

       });


  },
  getModelFilterCSS: function(){

      return '#grey{ polygon-fill: #eaeaea; polygon-opacity: 0.8; '+
               'line-color: #FFF; line-width: 0; line-opacity: 0; }';
  }


};


function setZoomButtons(desktop){

  var buttons=[];

    zoomPlus=  L.easyButton( 'fa-plus',  function(control, map){

      if(ui_config.isSingleMode()){

        map.setZoom(map.getZoom()+1);

        handleZoomState();


        ui_config.showUpdating();

        zoomMinus.enable();

        if(pheno.isShown())  pheno.scale(map.getZoom());

        layer_config.setCurrent('zoom',map.getZoom())


      }

      else{

          zoomPlus.disable();
          zoomMinus.disable();

      }

    });

    buttons.push(zoomPlus);

    zoomMinus=L.easyButton( 'fa-minus',  function(control, map){

      if(ui_config.isSingleMode()){

        map.setZoom(map.getZoom()-1);

        handleZoomState();

        ui_config.showUpdating();


        if(pheno.isShown()) pheno.scale(map.getZoom());

        layer_config.setCurrent('zoom',map.getZoom())


      }
      else{

          zoomMinus.disable();
          zoomPlus.disable();


      }

    });

    buttons.push(zoomMinus);

    if(ui_config.isDesktop() && !ui_config.isEmbedded()){

      zoomExtend=  L.easyButton({
        states: [{
            stateName: 'extend',
            icon: 'fa-search-minus',
            title: 'Full coverage',
            onClick: function(control) {
              //scatteredMarkerMap.addLayer(markerGroup);
              control.state('retract');
              layer_config.extendCoverage(map.getZoom());
              loadMap(false);

            }
          }, {
            icon: 'fa-search-plus',
            stateName: 'retract',
            title: 'Core area',
            onClick: function(control) {
              //scatteredMarkerMap.removeLayer(markerGroup);
              control.state('extend');
              layer_config.extendCoverage(map.getZoom());
              loadMap(false);
            }
          }]}
      );


        buttons.push(zoomExtend);

    }


    buttons.push(L.easyButton( 'fa-share-alt', function(control, map){

      if($('#share_panel').hasClass('shown')) $('#share_panel').removeClass('shown');
      else   $('#share_panel').addClass('shown');

      ui_config.updateShareState();

    }));


  if(ui_config.isDoubleMode()){

    zoomMinus.disable();
    zoomPlus.disable();

  }
  else{


    if(layer_config.getCurrent('zoom')>=layer_config.getCurrent('zoom_max')) zoomPlus.disable();
    else  zoomPlus.enable();
    if(layer_config.getCurrent('zoom')<=layer_config.getCurrent('zoom_min')) zoomMinus.disable();
    else zoomMinus.enable();




  }




  var zoomBar = L.easyBar(buttons);




  zoomBar.setPosition('topright');
  // add it to the map
  if(desktop) zoomBar.addTo(map);

}

function handleZoomState(){

  if(map.getZoom()<=layer_config.getCurrent('zoom_min')) zoomMinus.disable();
  else zoomPlus.enable();

  if(map.getZoom()>=layer_config.getCurrent('zoom_max')) zoomPlus.disable();
  else zoomPlus.enable();

}

var allyears = $('#help').val() + '#all-years';

var legend ={


  legends:{
    counts:{
      'columns':2,'columns_mobile':3,'img':'counts.png','title':'Counts map','description':'<p>These maps show the maximum count recorded for the selected species in each 30x30 km square and week (in <a href="'+allyears+'" target="_blank">\"All years\"</a> maps, the average of the maximum count of each year is shown). </p><p><i>Note that the original counts used to obtain these figures mostly refer to casual counts or rough estimates of the number of birds detected in a given site and date. Only rarely they refer to formal censuses or exhaustive counts. These maps, therefore, only show a rough approximation of the real variability in bird numbers across space and time. Also take into account that not all species detected end up being reported and, thus, the absence of records in a given square does not automatically mean that the species was not observed there.</i></p>',
      'categories':[
        {'title':'Not recorded','color':'#cccccc','size':'size_4','type':'circle'},
        {'title':'1 - 5','color':'#eeeeee','size':'size_4','type':'circle'},
        {'title':'6 - 10','color':'#7fcdbb','size':'size_6','type':'circle'},
        {'title':'11 - 100','color':'#41b6c4','size':'size_8','type':'circle'},
        {'title':'101 - 1,000','color':'#1d91c0','size':'size_10','type':'circle'},
        {'title':'>1,000','color':'#225ea8','size':'size_12','type':'circle'},
      ]},
      occurrence:{
        'columns':2,'img':'occurrence.png','title':'Occurrence map','description':'<p>These maps show the 30x30 km squares where the selected species was recorded or not each week.</p> <p><i>Note that not all species detected end up being reported and, thus, the absence of records in a given square does not automatically mean that the species was not observed there.</i></p>',
        'categories':[
          {'title':'Not recorded','color':'#cccccc','size':'small','type':'square'},
          {'title':'Recorded','color':'#ff087b','size':'big','type':'square'},
        ]

      },
      traces:{
        'columns':2,'img':'traces.png','title':'Traces map','description':'<p>These maps show the 30x30 km squares where the selected species has been recorded during each week but also during the two previous ones, enhancing the visualization of rapid temporal changes in distribution and their “traces” over time.</p> <p><i>Note that not all species detected end up being reported and, thus, the absence of records in a given square does not automatically mean that the species was not observed there.</i></p>',
        'categories':[
          {'title':'Not recorded','color':'#cccccc','size':'size_4','type':'circle'},
          {'title':'This week','color':'#fc4e2a','size':'size_6','type':'circle'},
          {'title':'Previous week','color':'#ffda9d','size':'size_10','type':'circle'},
          {'title':'2 weeks ago','color':'#ffda9d','size':'size_12','type':'circle'},
        ]
      },
      phenology:{
        'columns':2,'img':'phenology.png','title':'Phenological map','description':'<p>These maps depict the phenology of the selected species in seven different geographical sectors according to the percentage of 30x30 km squares where the species has been recorded in each sector and week.</p>',
        'categories':[
          {'title':'Weekly value','color':'#2cb8ad','size':'','type':'square'},
          {'title':'Mean (2010-2016)','color':'#fc970e','size':'','type':'line'}
        ]
      },
      cro:{
        'columns':1, 'img':'model.png','title':'Corrected regional occurrence (CRO) map','description':'<p>These maps make use of a complex set of spatial and temporal aggregation and smoothing procedures to account for differences in observational effort and reporting activity of the observers <a href="#" data-toggle="modal" data-target="#modelModal">(click here for further details)</a>. They are specifically intended to help visualize large-scale temporal changes in bird distribution and thus they should not be interpreted at a local scale. For each 30x30 km square and week these maps depict the estimated regional frequency of occurrence of the selected species. </p><p><i>Modelling the spatial and temporal dynamics of bird distributions is one of the main but challenging objectives of the EBP project. This work is underway and, therefore, it has to be stressed that the maps shown here are very preliminary.</i></p>',
        'categories':[
          {'title':'0','color':'#FFFFCC'},
          {'title':'&nbsp;','color':'#FFEDA0'},
          {'title':'&nbsp;','color':'#FED976'},
          {'title':'&nbsp;','color':'#FEB24C'},
          {'title':'&nbsp;','color':'#FD8D3C'},
          {'title':'&nbsp;','color':'#FC4E2A'},
          {'title':'&nbsp;','color':'#E31A1C'},
          {'title':'&nbsp;','color':'#B10026'},
          {'title':'1','color':'#860f28'}]
      },
      mm:{
        'img':'precipitation.png',
        'title':'Precipitation map',
        'description':'<p>These maps show the total precipitation amount for each 30x30 km square and week (recalculated from <a href="#e-obs">E-OBS high-resolution gridded dataset v10.0</a>). In <a href="'+allyears+'" target="_blank">"All years"</a> maps, the average of the total precipitation amount of each year is shown.</p>'
      },
      tm:{
        'img':'ta_min.png',
        'title':'Minimum temperature map',
        'description':'<p>These maps show the minimum temperature for each 30x30 km square and week (recalculated from <a href="#e-obs">E-OBS high-resolution gridded dataset v10.0</a>). In <a href="'+allyears+'" target="_blank">"All years"</a> maps, the average of the minimum temperature of each year is shown.</p>'
      },
      ta:{
        'img':'ta_mean.png',
        'title':'Mean temperature map',
        'description':'<p>These maps show the mean temperature for each 30x30 km square and week (recalculated from <a href="#e-obs">E-OBS high-resolution gridded dataset v10.0</a>). In <a href="'+allyears+'" target="_blank">"All years"</a> maps, the average of the mean temperature of each year is shown.</p>'
      },
      tx:{
        'img':'ta_max.png',
        'title':'Maximum temperature map',
        'description':'<p>These maps show the maximum temperature for each 30x30 km square and week (recalculated from <a href="#e-obs">E-OBS high-resolution gridded dataset v10.0</a>). In <a href="'+allyears+'" target="_blank">"All years"</a> maps, the average of the maximum temperature of each year is shown.</p>'
      },
      time_mode:{



      },
      temperature:{
        'columns':1, 'categories':[
          {'title':'-40º','color':'#BBBBD2'},
          {'title':'&nbsp;','color':'#2F2FA3'},
          {'title':'&nbsp;','color':'#0B0BEA'},
          {'title':'&nbsp;','color':'#0146FF'},
          {'title':'&nbsp;','color':'#01ACFF'},
          {'title':'&nbsp;','color':'#03FFF6'},
          {'title':'&nbsp;','color':'#19FFB3'},
          {'title':'&nbsp;','color':'#36FF5D'},
          {'title':'0','color':'#57FF38'},
          {'title':'&nbsp;','color':'#B2FF1A'},
          {'title':'&nbsp;','color':'#F0FF05'},
          {'title':'&nbsp;','color':'#FFCC00'},
          {'title':'&nbsp;','color':'#FF7C00'},
          {'title':'&nbsp;','color':'#FF4400'},
          {'title':'&nbsp;','color':'#F60000'},
          {'title':'40º','color':'#7A0000'}
        ]
      },
      precipitation:{
        'columns':1, 'description':'These maps show the total precipitation amount for each 30x30 km square and week (recalculated from <a href="#e-obs">E-OBS high-resolution gridded dataset v10.0</a>). In <a href="'+allyears+'" target="_blank">"All years"</a> maps, the average of the total precipitation amount of each year is shown.',
        'categories':[
          {'title':'0','color':'#CFBAAD'},
          {'title':'&nbsp;','color':'#DD9E74'},
          {'title':'&nbsp;','color':'#EE7C30'},
          {'title':'&nbsp;','color':'#FA6F00'},
          {'title':'&nbsp;','color':'#FB9900'},
          {'title':'&nbsp;','color':'#FDCA00'},
          {'title':'&nbsp;','color':'#FEF400'},
          {'title':'&nbsp;','color':'#62FF00'},
          {'title':'&nbsp;','color':'#01FF58'},
          {'title':'&nbsp;','color':'#01FFB9'},
          {'title':'&nbsp;','color':'#05E9F4'},
          {'title':'&nbsp;','color':'#0CCDE6'},
          {'title':'&nbsp;','color':'#14AAD3'},
          {'title':'&nbsp;','color':'#1C8AC3'},
          {'title':'&nbsp;','color':'#2662AF'},
          {'title':'320','color':'#2E419D'},

        ]
      }
  },

  setLegend: function(_type){

    var data=this.legends[_type]['categories'];

    if(this.legends[_type]['columns']==2){

      var col=2;
      var extra_style='';
      var first='';

      if(ui_config.isMobile()){

        if(this.legends[_type]['columns_mobile']) {
          col=this.legends[_type]['columns_mobile'];
          extra_style=' legend_mobile';
        }

        extra_style=' legend_mobile_'+col;

      }


      var elem_by_col=data.length/col;

      var div='';

      for (var i = 0; i < data.length; i++) {


        if(i % elem_by_col==0) {

            if(i==0)   div +='<div class="legend_column_l'+extra_style+' first">';
            else if(i==(data.length-elem_by_col)) div +='</div><div class="legend_last_column'+extra_style+'">'
            else div +='</div><div class="legend_column_l'+extra_style+'">'

        }

        var size="";

        if(data[i]['size']!=='') size=' '+data[i]['size'];

        div +='<div><span class="'+data[i]['type']+size+'" style="background:' + data[i]['color'] + '"></span> ' + data[i]['title'] + '</div>';

      }
      div +='</div>'
      return div;

    }
    else{

      var div="<div class='legend-scale'><ul class='legend-labels'>";

      for (var i = 0; i < data.length; i++) {

             div +="<li class='"+_type+"'>"+data[i]['title']+"<span class='square' style='background:"+data[i]['color']+";'></span></li>";

      }
      div +='</ul></div><div style="clear:both;"></div>';

      return div;
      }

    },
    getTabText: function(_type){

      var path = $('#current_path').val();

      var img='<div class="col-md-4"><img src="'+path+'/img/help/'+this.legends[_type].img+'"/></div>';
      var text='<div class="col-md-8"><h2>'+this.legends[_type].title+'</h2>'+this.legends[_type].description+'</div>';

      return img+text+'<div style="clear:both;"></div>';

    },
    getTabOnlyText: function(_type){

      if(ui_config.isEmbedded()){

        var html='';
        var description=$(this.legends[_type].description).remove( "i" ).html();
        var year_text=ui_config.getYear('unique');
        var live_desc='';

        if(ui_config.isInterval()) year_text='Jul '+year_text+' / Jun '+(parseInt(year_text)+1);
        if(ui_config.isLastWeeks()){
          year_text='<span data-toggle="tooltip" data-placement="bottom" title="Showing data from last 52 complete weeks" class="label label-live">LIVE</span>';
          live_desc='<p><span class="label label-live">LIVE</span> maps show data from the previous day back to one year ago. As in all other EBP maps data is grouped in 52 weeks.<p>';
        }

        if(year_text==='2000') year_text='All years';

        return html+'<h2>'+this.legends[_type].title+' - '+year_text+'</h2>'+live_desc+'<div class="legend_map">'+this.setLegend(_type)+'</div><div style="clear:both;"></div><br/>'+description;

      }
      else{

        return '<h2>'+this.legends[_type].title+'</h2>'+this.legends[_type].description;

      }



    }



};


$(function() {


  $(".dropdown-menu li a").click(function(){

    var legend_div=$(this).closest('.legend');
    var position='right';
    if($(legend_div).hasClass('left')) position='left';

    var value=$(this).parent().data('value');
    var _type=$(this).parents(".dropdown").data('type');
    var label=$(this).text();

    ui_config.eventChangeMapSelect(value,_type,label,position);


  });

  $(".close_share").click(function() {

    if($('#share_panel').hasClass('shown'))  {

      $('#share_panel').removeClass('shown');

    }
    else{

      $('#share_panel').addClass('shown');
      ui_config.updateShareState();

    }

  });

  /*
   *    SHARE PANEL TEXTAREA UPDATE
   */

   $('.size_selector .btn').on('change', function() {
     ui_config.updateShareCode();
   });

   $('.panel_btn').on('click', function() {

     $(this).siblings().removeClass('active_side');
     $(this).addClass('active_side');
     ui_config.updateShareCode();

   });


});
