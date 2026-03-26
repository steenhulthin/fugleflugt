ui_config['opposite'] ={'left':'right','right':'left'};
ui_config['new_conf'] ={'left':'','right':'','unique':''};

ui_config['default_conf'] ={'left':{'map_type':'r', 'input_type':'species',
                                    'year':ui_config.getLast52WeeksRange(),
                                    'species':'HIRRUS'},
                            'right':{'map_type':'r', 'input_type':'species',
                                      'year':ui_config.getLast52WeeksRange(),
                                      'species':'CUCCAN'},
                            'unique':{'map_type':'q', 'input_type':'species',
                                      'year':ui_config.getLast52WeeksRange(),
                                      'species':'HIRRUS'}
                              };


ui_config['init'] = function(desktop,mode,tablet){

      if(tablet==='') this.tablet=false;
      else this.tablet=true;


      if(desktop==='') {

        this.desktop=false;
        this.mode='single';

      }
      else this.desktop=desktop;

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
        // ui_config.hideTooltip(e.trigger);
      });


      ui_config.updateUrlHash();


      if(!this.isMobile()){

          $('[data-info="tooltip"]').tooltip();

          $('.timeline-tooltip').position({
            'within': '#map',
            'collision': 'fit'
          });

      }



      if(/*this.isDesktop() &&*/ mode==='single'){

        //Init with empty objects
        ui_config.collapseLegend($('.legend'),false);
        this.initEmptyDoubleMap();
        this.initSingleMapMode('unique',true);


      }
      else if (!this.isDesktop){

        this.mode='single';
        this.uiExpandLegend($('.legends_left .current'));

      }

      if(ui_config.isTablet() && ui_config.isDoubleMode()) ui_config.handleRotationMessage();

      //  ui_config.handleBothCROActiveYears();
      this.updateShareCode();
      ui_config.initTimeMode();



    };

    /* Init time Mode */
    ui_config['initTimeMode']=function(){

      $('.time_btn').removeClass('active_side');

      if(ui_config.isInterval()){

        $(".time_btn[data-value='split'").addClass('active_side');
        ui_config.prev_year_mode='split';

      }
      else if(ui_config.isLastWeeks()){

        $(".time_btn[data-value='live'").addClass('active_side');
        ui_config.prev_year_mode='live';

      }
      else{

        $(".time_btn[data-value='calendar'").addClass('active_side');
        ui_config.prev_year_mode='calendar';

      }

      if(!ui_config.isEmbedded()) ui_config.updateTimeModeAvailableYears();


    };



/* Main action A: Setting initial species, year, map_type selection */
ui_config['loadConfig']=function(species_code,map_code,year,position,input_type){

      var curr_conf=Object.create(MapConf);
      var new_conf=Object.create(MapConf);

      var common_name=$("#"+species_code+" .title" ).text();

      curr_conf.init(species_code,common_name,input_type,year,map_code);

      if(ui_config.isDebug()) {
        console.log('A) loadConfig '+position);
        curr_conf.print();
      }

      if(year.toString().indexOf("-") > -1) this.year_mode='split';
      if(year.toString().indexOf("_") > -1) this.year_mode='live';

      valid=this.validateParams(curr_conf);

      this.setConfig(curr_conf,'current',position);
      this.setConfig(new_conf,'new',position);

      if(position==='unique') this.mode='single';

      if(valid) this.updateSpeciesLegend(this.current_conf[position],position);
      if(valid) this.activateSpeciesSelector(this.current_conf[position],position);


};



/* Main action B: preload Species: when species from panel has been choosen */
ui_config['preloadSpecies']=function(species_code,common_name,position,input_type) {

      var legend_position=position;
      if(position==='unique') legend_position='left';

      var config=this.getConfig('new',position);
      config.setSpeciesCode(species_code);
      config.setCommonName(common_name);
      config.setInputType(input_type);
      if(input_type=='temperature' || input_type=='precipitation'){

        config.setMapType('t');

      }
      else{
        config.setMapType(this.getConfig('current',position).map_type);
      }

      if(ui_config.isDebug()) {
        console.log('B) Pre load species '+position);
        config.print();
      }

      this.uiUpdateActions(input_type,legend_position);

      if(!config.isSpecies()){

          /* When context data is choosen we show dropdown for temperature or precipitation */

          if(config.isTemperature()) this.selectDropdown('temperature_'+legend_position,species_code,false);
          else if(config.isPrecipitation()) this.selectDropdown('mm_'+legend_position,species_code,false);

          if(position=='right' || ui_config.isSingleMode()){

            var year=config.getYear(position);
            if(year=='') year=ui_config.current_conf[position].getYear();

            if(year in ui_config.disabled_years.context){

              ui_config.forceYear('2000',legend_position);

            }

          }

      }
      else{

          /* Preload with CRO */
          if(config.isCroMap()){

            var year=config.getYear(position);
            if(year=='') year=ui_config.current_conf[position].getYear();

            if(year in ui_config.disabled_years.cro){

              ui_config.forceYear('2000',legend_position);

            }

        }

        var old_config=this.getConfig('current',position);
        if(!old_config.getMapType() || old_config.getMapType()==='meteo') this.eventChangeMapSelect('occurrence','map','Occurrences',legend_position);

      }



      /* TODO: create preload state mobile */
      if(ui_config.isMobile()){

        $('.legend.'+legend_position+' .legend_map').hide();
        $('.legends_'+legend_position+' .current .species_common_name').html(config['common_name']);


        $('.legends_'+legend_position+' .current .species_common_name').parent().data("code",config['species_code']);

        $('.legends_'+legend_position+' .current .species_img a').data("code",config['species_code']);
        $('.legends_'+legend_position+' .current .species_img img').attr("src",this.getImagePath(config,true));
        $('.legends_'+legend_position+' .legend_extended .species_img').hide();

        this.uiUpdateActions(config['input_type'],'left');

      }
      else{

        if(ui_config.isCollapsedLegend(legend_position)) ui_config.collapseLegend($('.legend.'+legend_position+'.current'),false);
        this.showFrozenLegend(legend_position,position);

      }

      ui_config.updateMapTypeActiveYears(config.isCroMap(),legend_position);
      ui_config.updateContextActiveYears(config,legend_position);

      this.showUpdateMsg();

};


/* Main action C: User change map_type or year from selector */
ui_config['eventChangeMapSelect']=function(value,_type,label,position){

    if(ui_config.isDebug()) {
      console.log('C) Change map select '+value+' in position '+position);
    }

      //Changes dropdown state and return if it's been updated
      var updated=this.selectDropdown(_type+'_'+position,value,true);

      if(_type==='year') {

        this.updateYear(value, position,updated);
        this.uiUpdateActionsYearCondLegend(position,false);

        if(updated) $('.legends_'+position+' .current .year').addClass('updated');
        else $('.legends_'+position+' .current .year').removeClass('updated');

      }
      else if(_type==='map'){

        $('.legend.'+position+' .legend_map').html(legend.setLegend(value));

        this.updateMapType(value, position,updated);
        this.uiUpdateActionsMapCondLegend(position);

        if(updated) $('.legends_'+position+' .current .map_type').addClass('updated');
        else $('.legends_'+position+' .current .map_type').removeClass('updated');


      }
      else if(_type==='temperature'){

        $('.legend.'+position+' .legend_map').html(legend.setLegend(_type));

        if(ui_config.isSingleMode()) position='unique';

        this.new_conf[position]['input_type']=_type;
        this.new_conf[position]['species_code']=value;
        this.new_conf[position]['common_name']=$("#"+value+" .title" ).text();


        this.updateMapType('temperature', position,updated);
        this.uiUpdateActionsMapCondLegend(position);


      }

};




/* Main Action C.1. : Triggered when year has been choosen from dropdown
 * If interval is choosen then we force interval to the opposite map
 */
ui_config['updateYear']=function(value, position){

      if(this.isSingleMode()) position='unique';
      this.new_conf[position]['year']=value;

      if(ui_config.isDebug()) {
        console.log('c.1) Updated year '+position);
        this.new_conf[position].print();
      }

      if(this.isSingleMode()){

        if(!this.hasChanges('unique')) this.hideUpdateMsg();
        else this.showUpdateMsg();

      }
      else{

        if(!this.hasChanges('left') && !this.hasChanges('right')) this.hideUpdateMsg();
        else this.showUpdateMsg();

      }

};


/* Main Action C.2. : Triggered when map_type has been choosen from dropdown */
ui_config['updateMapType']=function(value, position){


      /* When mobile we don't show preload */
      if(this.isSingleMode()) {

        position='unique';

        this.new_conf[position].setMapType(this.map_types_inv[value]);
        var config=this.getConfig('new',position);

        ui_config.updateContextActiveYears(config,'left');
        ui_config.updateMapTypeActiveYears(config.isCroMap(),'left');

        if(!this.hasChanges(position)) this.hideUpdateMsg();
        else this.showUpdateMsg();

      }
      else{

        this.new_conf[position].setMapType(this.map_types_inv[value]);
        var config=this.getConfig('new',position);

        ui_config.updateContextActiveYears(config,position);
        ui_config.updateMapTypeActiveYears(config.isCroMap(),position);


        if(!this.hasChanges('left') && !this.hasChanges('right'))  this.hideUpdateMsg();
        else this.showUpdateMsg();
      }

      if(config.isCroMap()){

        /* If selected year is blocked we force to 2000 */
        var year=config.getYear(position);
        if(year=='') year=ui_config.current_conf[position].getYear();


        if(year in ui_config.disabled_years.cro){

            if(ui_config.isInterval()){

              if(this.isSingleMode()) ui_config.forceYear('2000-','left');
              else ui_config.forceYear('2000-',position);

            }
            else{

              if(this.isSingleMode()) ui_config.forceYear('2000','left');
              else ui_config.forceYear('2000',position);

            }



        }

      }

};



/* Force year with @value for a concrete map @position */
ui_config['forceYear']=function(value, position){

  if(ui_config.isSingleMode()) this.new_conf['unique'].setYear(value);
  else this.new_conf[position].setYear(value);

  this.selectDropdown('year_'+position,value,true);
  this.uiUpdateActionsYearCondLegend(position,true);

};



/* Loading message from @config and @position */
ui_config['loadLegend']=function(config,position){

    if(config.isSpecies()) $('.legend.'+position+' .legend_map').html(legend.setLegend(config.getMapType()));
    else $('.legend.'+position+' .legend_map').html(legend.setLegend(config.getInputType()));

};


    /* Validate config params */
ui_config['validateParams']=function(map_config){

  var valid=true;

  if($('#'+map_config.getSpeciesCode()).length==0) valid=false;
  else if (this.year_mode=='split'){

    if(
        (
            map_config.getSimpleYear() > (ui_config.getLastSplitYear())

            || map_config.getSimpleYear() < 2010

        )
          && map_config.getSimpleYear() !=2000
      ) valid=false;

  }
  else if (this.year_mode=='live'){

  }
  else{

      if((map_config.getYear() >= ui_config.last_year || map_config.getYear() < 2010) && map_config.getYear() !=2000 ) valid=false;

  }

  if(map_config.isCroMap() && this.disabled_years.cro[map_config.getYear()]) valid=false;
  if(map_config.isMeteo() && this.disabled_years.context[map_config.getYear()]) valid=false;

  if(!valid) showLoadMapError();

  return valid;


};

    /* Initial config unique map */
ui_config['initEmptyDoubleMap']=function(){

      var new_conf=Object.create(MapConf);
      this.setConfig(new_conf,'current','left');

      var new_conf=Object.create(MapConf);
      this.setConfig(new_conf,'new','left');

      var new_conf=Object.create(MapConf);
      this.setConfig(new_conf,'current','right');

      var new_conf=Object.create(MapConf);
      this.setConfig(new_conf,'new','right');

};

ui_config['updateContextActiveYears']=function(config,position) {

  if(!config.isSpecies()){

    $.each( ui_config.disabled_years.context, function( key, value ) {

      $('.legend.'+position+' .year_drop li[data-value="'+key+'"] a').addClass('disabled_context');

    });

  }
  else{

      $.each( ui_config.disabled_years.context, function( key, value ) {

        $('.legend.'+position+' .year_drop li[data-value="'+key+'"] a').removeClass('disabled_context');

      });

  }


};


/* Checks if selected @map_type in @postion has an extra layer */
ui_config['updateMapTypeActiveYears']=function(active,position) {

  if(ui_config.isDebug()) console.log('-- CRO is active --'+active+' --- '+position);
  if(active){

    $.each( ui_config.disabled_years.cro, function( key, value ) {

       $('.legend.'+position+' .year_drop li[data-value="'+key+'"] a').addClass('disabled_cro');

     });

  }
  else{

    $.each( ui_config.disabled_years.cro, function( key, value ) {

       $('.legend.'+position+' .year_drop li[data-value="'+key+'"] a').removeClass('disabled_cro');

     });

  }

};



    /* Species preload canceled */
ui_config['cancelPreloadSpecies']=function(position){

      var legend_position=position;

      if(ui_config.isSingleMode()) position='unique';

      this.uiRemovePreloadState(legend_position);

      var config=this.getConfig('current',position);
      this.updateSpeciesLegend(config,legend_position);

      //if(position!=='left')
      ui_config.updateContextActiveYears(config,position);

      var new_conf=Object.create(MapConf);
      this.setConfig(new_conf,'new',position);

      ui_config.updateMapTypeActiveYears(config.isCroMap(),position);

      if(ui_config.isSingleMode() || !this.hasChanges(this.opposite[position])) this.hideUpdateMsg();

      this.activateSpeciesSelector(config,position);

      this.updateUrlHash();

};


/* Main method to update time mode */
ui_config['updateTimeModeAvailableYears']=function(){

    if(ui_config.isInterval()){
      $('.cal_year').hide();
      $('.split_year').show();
      $('.live_year_selector').hide();
      $('.year_drop').removeClass('live_year');

    }
    else if(ui_config.isLastWeeks()){
      $('.cal_year').hide();
      $('.split_year').hide();
      $('.live_year_selector').show();

      $('.year_drop').addClass('live_year');


    }
    else{
      $('.cal_year').show();
      $('.split_year').hide();
      $('.live_year_selector').hide();
      $('.year_drop').removeClass('live_year');

    }

};

ui_config['updateTimeModeSelector']=function(){

  if(ui_config.isLastWeeks()) {

      $('#map_mode .map_mode_label').html('LIVE (last 52 weeks)');
      $('#map_mode span').addClass('live');
      $('#map_mode span').removeClass('non-live');

  }
  else{

    if(ui_config.isInterval()){

      $('#map_mode .map_mode_label').html('Split year (Jul-Jun)');

    }
    else{

      $('#map_mode .map_mode_label').html('Calendar year (Jan-Dec)');

    }

    $('#map_mode span').removeClass('live');
    $('#map_mode span').addClass('non-live');

  }

};


ui_config['updateTimeContextInfo']=function(){

  if(ui_config.isLastWeeks()) {


    $('.context_data_list').hide();
    $('#context_disabled_alert').show();


  }
  else{

    $('.context_data_list').show();
    $('#context_disabled_alert').hide();

  }

};


ui_config['updateTimeModeInfo']=function(){


  if(ui_config.isLastWeeks()) {

    $('#realtime_info').show();

    $('.legend.left .dropdown-menu li[data-value="cro"] a').addClass('disabled_cro');
    $('.legend.right .dropdown-menu li[data-value="cro"] a').addClass('disabled_cro');




  }
  else {
    $('#realtime_info').hide();

    $('.legend.left .dropdown-menu li[data-value="cro"] a').removeClass('disabled_cro');
    $('.legend.right .dropdown-menu li[data-value="cro"] a').removeClass('disabled_cro');

  }

  ui_config.updateTimeModeSelector();
  ui_config.updateTimeContextInfo();


};

/* Pre select timemode */
ui_config['updateTimeMode']=function(time_mode){


  this.year_mode=time_mode;

  force_update=false;

  ui_config.updateTimeModeAvailableYears();
  ui_config.updateTimeModeSelector();
  ui_config.updateTimeContextInfo();

  if(time_mode=='live'){

    ui_config.forceYear(ui_config.getLast52WeeksRange(),'left');
    if(ui_config.isDoubleMode()) ui_config.forceYear(ui_config.getLast52WeeksRange(),'right');

    $('.legend.left .dropdown-menu li[data-value="cro"] a').addClass('disabled_cro');
    if(ui_config.isDoubleMode()) $('.legend.right .dropdown-menu li[data-value="cro"] a').addClass('disabled_cro');


    if(ui_config.isDoubleMode()) {

      var left_config=this.getConfig('current','left');
      if(left_config.isCroMap()) ui_config.forceMapType('traces','left');

      var right_config=this.getConfig('current','right');
      if(right_config.isCroMap()) ui_config.forceMapType('traces','right');

      if(right_config.isMeteo() || (ui_config.hasChanges('right') && ui_config.getConfig('new','right').isMeteo())){

        var species_code=ui_config['default_conf']['right']['species'];
        var species_name=$('#'+species_code+' .species_latin').html();

        ui_config.forceYear(ui_config.getLast52WeeksRange(),'right');
        ui_config.preloadSpecies(species_code,species_name,'right','species');
        $('.legend.right .dropdown-menu li[data-value="cro"] a').addClass('disabled_cro');
        force_update=true;

      }



    }
    else{

      var left_config=this.getConfig('current','unique');
      if(left_config.isCroMap()) ui_config.forceMapType('traces','unique');
      else if(left_config.isMeteo()){

        var species_code=ui_config['default_conf']['unique']['species'];
        var species_name=$('#'+species_code+' .species_latin').html();

        ui_config.preloadSpecies(species_code,species_name,'unique','species');
        $('.legend.left .dropdown-menu li[data-value="cro"] a').addClass('disabled_cro');

      }



    }



  }
  else if(time_mode=='split') {

    $('.legend.left .dropdown-menu li[data-value="cro"] a').removeClass('disabled_cro');
    if(ui_config.isDoubleMode()) $('.legend.right .dropdown-menu li[data-value="cro"] a').removeClass('disabled_cro');

    if(ui_config.isDoubleMode()){

      ui_config.forceYear((ui_config.getLastSplitYear())+'-','left');

      var right_config=this.getConfig('current','right');
      if(right_config.isCroMap() || right_config.isMeteo())  ui_config.forceYear('2000-','right');
      else ui_config.forceYear((ui_config.getLastSplitYear())+'-','right');

    }
    else{

      var left_config=this.getConfig('current','unique');
      if(left_config.isCroMap() || left_config.isMeteo())  ui_config.forceYear('2000-','left');
      else ui_config.forceYear((ui_config.getLastSplitYear())+'-','left');


    }

  }
  else{

    $('.legend.left .dropdown-menu li[data-value="cro"] a').removeClass('disabled_cro');
    if(ui_config.isDoubleMode()) $('.legend.right .dropdown-menu li[data-value="cro"] a').removeClass('disabled_cro');

    if(ui_config.isDoubleMode()){

      ui_config.forceYear((ui_config.last_year-1)+'','left');
      var right_config=this.getConfig('current','right');
      if(right_config.isCroMap() || right_config.isMeteo())  ui_config.forceYear('2000','right');
      else ui_config.forceYear((ui_config.last_year-1)+'','right');

    }
    else{

      var left_config=this.getConfig('current','unique');
      if(left_config.isCroMap() || left_config.isMeteo())  ui_config.forceYear('2000','left');
      else ui_config.forceYear((ui_config.last_year-1)+'','left');

    }

  }

  if(ui_config.isDoubleMode() && (!this.hasChanges('left') && !this.hasChanges('right')) && !force_update) this.hideUpdateMsg();
  else if (ui_config.isSingleMode() && !this.hasChanges('unique')) this.hideUpdateMsg();
  else this.showUpdateMsg();



};




/* Force year with @value for a concrete map @position */
ui_config['forceMapType']=function(value, position){

  ui_config.new_conf[position].setMapType(this.map_types_inv[value]);
  ui_config.updateMapTypeActiveYears(ui_config.new_conf[position].isCroMap(),position);

  if(position=='unique') position='left';
  this.selectDropdown('map_'+position,value,true);



};


  /* Main method to update species_legend with @species_conf in @position */
  ui_config['updateSpeciesLegend']=function(species_conf,position){

        var legend_position=position;

        if(ui_config.isSingleMode() || position==='unique') legend_position='left';

        $('.legends_'+legend_position+' .current .species_common_name').html(species_conf['common_name']);
        $('.legends_'+legend_position+' .current .species_common_name').parent().data("code",species_conf['species_code']);
        $('.legends_'+legend_position+' .current .species_img a').data("code",species_conf['species_code']);

        if(species_conf.isSpecies()){


          $('.legends_'+legend_position+' .current .species_img a').tooltip('enable');
          $('.legends_'+legend_position+' .current .species_common_name').parent().tooltip('enable');
          $('.legends_'+legend_position+' .current .species_common_name').parent().removeClass('disabled');
          $('.legends_'+legend_position+' .current .species_img a').removeClass('disabled');
        }
        else{
          $('.legends_'+legend_position+' .current .species_img a').tooltip('disable');
          $('.legends_'+legend_position+' .current .species_common_name').parent().tooltip('disable');
          $('.legends_'+legend_position+' .current .species_common_name').parent().data("target","#map_info_1");
          $('.legends_'+legend_position+' .current .species_img a').addClass('disabled');
          $('.legends_'+legend_position+' .current .species_common_name').parent().addClass('disabled');

        }

        $('.legends_'+legend_position+' .current .species_img img').attr("src",this.getImagePath(species_conf,true));
        $('.legends_'+legend_position+' .dropdown li').removeClass('selected');

        ui_config.uiUpdateActions(species_conf['input_type'],position);


        var selected_map=$('#map_'+legend_position).find("li[data-value='" + species_conf.getMapType() + "']");
        $(selected_map).addClass('selected');

        var map_type_text=$(selected_map).find('a').text();

        $('#map_'+legend_position+' .btn').html( map_type_text + ' <span class="caret"></span>');

        $('.legends_'+legend_position+' .map_type').html(map_type_text);
        $('.legends_'+legend_position+' .map_type').removeClass('updated');


        $('.legends_'+legend_position+' .year').html(species_conf['year']);
        $('.legends_'+legend_position+' .year').removeClass('updated');


        $('#map_'+legend_position+' .btn').val(species_conf.getMapType());
        $('#map_'+legend_position+' .btn').removeClass('updated');


        var selected_year=$('#year_'+legend_position).find("li[data-value='" + species_conf['year'] + "']");
        $(selected_year).addClass('selected');

        var selected_year_text=$(selected_year).find('a').text();


        if(species_conf['year'].toString().indexOf("_") > -1){

          var last_year=species_conf['year'].toString().split('_')[1]

          if(last_year==$('#last_52_weeks_year').val()) $('#year_'+legend_position+' .btn').html('Last 52 weeks <span class="caret"></span>');
          else $('#year_'+legend_position+' .btn').html('Previous last <span class="caret"></span>');


        }
        else{

          $('#year_'+legend_position+' .btn').html(selected_year_text + ' <span class="caret"></span>');

        }


        $('#year_'+legend_position+' .btn').val(species_conf['year']);
        $('#year_'+legend_position+' .btn').removeClass('updated');

        var year_label=species_conf.getSimpleYear()
        if(year_label==='2000') year_label='All years';
        $('#'+legend_position+'_year_label').html(year_label);

        if(ui_config.isMobile()){

          $('.legend.'+legend_position+' .legend_map').show();
          this.uiUpdateActionsCondLegend('left',false);

        }
        else{

          if(ui_config.isDoubleMode()){


            if(ui_config.current_conf[this.opposite[position]]){

              if(ui_config.current_conf[position].getSpeciesCode()===ui_config.current_conf[ui_config.opposite[position]].getSpeciesCode()){

                $('.move_to').attr('disabled',true);

              }
              else{

                $('.move_to').attr('disabled',false);

              }

            }
            else{

              $('.move_to').attr('disabled',false);

            }

            if(!ui_config.current_conf[position].isSpecies()) $('.legends_'+legend_position+' .move_to').attr('disabled',true);
            else $('.legends_'+legend_position+'.move_to').attr('disabled',false);

          }
          else{

            if(ui_config.current_conf['unique'].isSpecies())  $('.show_double_map').attr('disabled',false);
            else $('.show_double_map').attr('disabled',true);

          }

        }

        if($('.legends_'+legend_position+' .current .species_common_name').height() > 20 ) $('.legends_'+position+' .current .species_common_name').addClass('long');
        else if ($('.legends_'+legend_position+' .current .species_common_name').hasClass('long')) $('.legends_'+position+' .current .species_common_name').removeClass('long');

        ui_config.updateMapTypeActiveYears(species_conf.isCroMap(),legend_position);

        if(ui_config.isDebug()) console.log('Context active years '+position);
        if(position!='left') ui_config.updateContextActiveYears(species_conf,legend_position);

        ui_config.uiUpdateActionsCondLegend(legend_position,false);
        ui_config.loadLegend(species_conf,legend_position);

  };

/* Activate species panel selector with provided @species_conf from side @position */
ui_config['activateSpeciesSelector']=function(species_conf,position){

      $(".selector."+position).removeClass('active');

      if(species_conf.getInputType()==='species') $("#"+species_conf['species_code']+" .selector."+position).addClass('active');
      else $("#"+species_conf['species_code']+" .selector."+position).addClass('active');

};

    /* When species is selected from panel, selected species is preloaded */
ui_config['eventSelectSpecies']=function(code,input_type,common_name,position){


      if(ui_config.isSingleMode()){

        $(".selector.unique").removeClass('active');
        ui_config.preloadSpecies(code,common_name,'unique',input_type);


      }
      else{

        $(".selector."+position).removeClass('active');
        ui_config.preloadSpecies(code,common_name,position,input_type);

      }

};


ui_config['showUpdateMsg']=function(){


  $('.move_to').attr('disabled',true);
  if(this.isDoubleMode())  $('.show_unique_map').attr('disabled',true);
  else $('.show_double_map').attr('disabled',true);

  $('#map_switcher').hide();

  $('#update_msg').show();

};

ui_config['hideUpdateMsg']=function(){

  if(this.isDoubleMode()) $('.show_unique_map').attr('disabled',false);
  else $('.show_double_map').attr('disabled',false);

  $('#map_switcher').show();


  $('#update_msg').hide();

};

ui_config['updateMapConf']=function(){

        /* Remove updated states */
        $('.dropdown button').removeClass('updated');
        $('.species_info_condensed span').removeClass('updated');

        this.hideUpdateMsg();

        if(this.isDoubleMode()) $('.show_unique_map').attr('disabled',false);
        else $('.show_double_map').attr('disabled',false);

        this.updateUrlHash();
        this.updateShareCode();

        torque_player.updateTimeLine();

        if(!this.isCollapsedLegend('left')) this.collapseLegend($('.legend.left.current'));
        if(this.isDoubleMode() && !this.isCollapsedLegend('right')) this.collapseLegend($('.legend.right.current'),true);

        loadMap(false);

        if(ui_config.isDebug()) console.log('Z) Updating new map config');

        if($('#sidebar-wrapper').hasClass('shown')) showNav();

};

ui_config['isCollapsedLegend']=function(position){

      var legend_extended=$($('.legend.'+position+'.current')).find('.legend_extended');
      return $(legend_extended).css('display') == 'none';

};

ui_config['collapseLegend']=function(legend,close){

      var legend_extended=$(legend).find('.legend_extended');

      if($(legend_extended).css('display') == 'none' && close ){

      }
      else{

        if($(legend_extended).css('display') == 'none'){

          ui_config.uiExpandLegend(legend);
          $(legend_extended).fadeIn();

        }
        else{

          ui_config.uiCollapseLegend(legend);
          $(legend_extended).fadeOut();

        }


      }

};

ui_config['updateUrlHash']=function(){

      if (window.history && window.history.pushState && !ui_config.isEmbedded()) {

          history.replaceState({}, "EBP", this.getConfigURL());
          share_url=window.location.href;
          $('#share_url').val(share_url);

      }

      this.updateShareState();

};

ui_config['getGlobalPhenologyUrl']=function(){

      var base_path=$('#global_pheno_path').val();

      if(ui_config.isSingleMode()) base_path=base_path+'/'+this.current_conf['unique'].getSpeciesVal()+'/'+this.getYear('unique');
      else if(ui_config.hasMeteo('right')) base_path=base_path+'/'+this.current_conf['left'].getSpeciesVal()+'/'+this.getYear('left');
      else base_path=base_path+'/'+this.current_conf['left'].getSpeciesVal()+'/'+this.getYear('left')+'/'+this.current_conf['right'].getSpeciesVal()+'/'+this.getYear('right');

      return base_path;


};

ui_config['getPhenologySQL']=function(position){

      var species_code='';
      var year='';

      if(ui_config.isSingleMode()) {

        species_code=this.current_conf['unique'].getSpeciesVal();
        year=this.getYear('unique');
        if(ui_config.isLastWeeks()) year=parseInt(year.toString().substring(0,4))+100;

      }
      else {
        species_code=this.current_conf[position].getSpeciesVal();
        year=this.getYear(position);
        if(ui_config.isLastWeeks()) year=parseInt(year.toString().substring(0,4))+100;

      }

      if(ui_config.isLastWeeks()){

          return encodeURIComponent('SELECT new_feno_ebp_year.'+species_code.toLowerCase()+' as '+species_code.toLowerCase()+', new_feno_ebp_mean.'+species_code.toLowerCase()+' as mean, new_feno_ebp_year.week,new_feno_ebp_year.sector FROM new_feno_ebp_year LEFT JOIN new_feno_ebp_mean on new_feno_ebp_year.week=(52-'+ui_config.last_week+'+new_feno_ebp_mean.week)%52+1 and new_feno_ebp_year.sector=new_feno_ebp_mean.sector where year='+year);


      }
      else{

        return 'SELECT new_feno_ebp_year.'+species_code.toLowerCase()+' as '+species_code.toLowerCase()+', new_feno_ebp_mean.'+species_code.toLowerCase()+' as mean, new_feno_ebp_year.week,new_feno_ebp_year.sector FROM new_feno_ebp_year,new_feno_ebp_mean where new_feno_ebp_year.week=new_feno_ebp_mean.week and new_feno_ebp_year.sector=new_feno_ebp_mean.sector and year='+year;

      }



};

/* Allows to copy one @species_conf_from to a segon @species_conf_to  */
ui_config['copyMapState']=function(species_conf_from,species_conf_to){

      species_conf_to['species_code']=species_conf_from['species_code'];
      species_conf_to['common_name']=species_conf_from['common_name'];
      species_conf_to['year']=species_conf_from['year'];
      species_conf_to['map_type']=species_conf_from['map_type'];
      species_conf_to['input_type']=species_conf_from['input_type'];

};

/* Updates current map_config @to_position from previous map_config @from_position */
ui_config['updateMapState']=function(from_position,to_position){

      if(this.new_conf[from_position].getSpeciesCode()!=='') this.current_conf[to_position].setSpeciesCode(this.new_conf[from_position].getSpeciesCode());
      if(this.new_conf[from_position].getCommonName()!=='') this.current_conf[to_position].setCommonName(this.new_conf[from_position].getCommonName());
      if(this.new_conf[from_position].getYear()!=='') this.current_conf[to_position].setYear(this.new_conf[from_position].getYear());
      if(this.new_conf[from_position].getMapType() && this.new_conf[from_position].getMapType()!=='') this.current_conf[to_position].setMapType(this.new_conf[from_position].getMapTypeCode());
      if(this.new_conf[from_position].getInputType()!=='') this.current_conf[to_position].setInputType(this.new_conf[from_position].getInputType());

      this.uiUpdateActionsCondLegend(to_position,false);

};


/*
 * Updates condensed legend year and map_type from @postion
 * and where @force_updated we mark is as updated
 */

ui_config['uiUpdateActionsCondLegend']=function(to_position,force_updated){

      this.uiUpdateActionsYearCondLegend(to_position,force_updated);
      this.uiUpdateActionsMapCondLegend(to_position);

};
    /*
     * Updates condensed legend year from @postion
     * and where @force_updated we mark is as updated
     */
ui_config['uiUpdateActionsYearCondLegend']=function(to_position,force_updated){

      var year_label=$('#year_'+to_position+' button').text();

      $('.legends_'+to_position+' .current .year').html(year_label);
      if(force_updated) $('.legends_'+to_position+' .current .year').addClass('updated');


};

/* Updates condensed legend map_type and map_type from @postion  */
ui_config['uiUpdateActionsMapCondLegend']=function(to_position){

      var config='';

      var config=ui_config.current_conf[to_position];

      if(this.isSingleMode()) config=ui_config.current_conf['unique'];

      if(config.isSpecies()) {

        label= $('.legends_'+to_position+' .current .map_type').html($('#map_'+to_position+' button').text());
        $('.legends_'+to_position+' .current .separator').show();

      }
      else $('.legends_'+to_position+' .current .separator').hide();

};


/* Cancel preload state and changes from legend in @position and
 * moves it back to current state
 */
ui_config['uiRemovePreloadState']=function(position){

      if(position=='both'){

        $('.frozen').hide();
        $('.current .show_extended').show();
        $('.current .cancel_update').hide();

        $('.current .show_extended').attr('disabled',false);
        $('.current').removeClass('new_selection');

        $('.new_selection').hide();

        $('.current .actions').show();
        $('.current .legend_map').show();


        $('.legend_header').removeClass('preUpdated');

      }
      else{

        $('.legends_'+position+' .frozen').hide();
        $('.legends_'+position+' .current .show_extended').show();
        $('.legends_'+position+' .current .cancel_update').hide();

        $('.legends_'+position+' .current .show_extended').attr('disabled',false);


        $('.legends_'+position+' .current').removeClass('new_selection');
        $('.legends_'+position+' .current .actions').show();
        $('.legends_'+position+' .current .legend_map').show();



        $('.legends_'+position+' .current .new_selection').hide();
        $('.legends_'+position+' .current .legend_header').removeClass('preUpdated');

      }

};

    /* Expand @legend */
ui_config['uiExpandLegend']=function(legend){

      $(legend).find('.species_info_condensed').hide();

      $(legend).find('.show_extended span').removeClass('glyphicon-plus');
      $(legend).find('.show_extended span').addClass('glyphicon-minus');
      $(legend).find('.show_panel').show();


      if(ui_config.isMobile()){

        $(legend).find('.legend_content .species_img img').hide();

        $(legend).find('.show_extended img').addClass('ninety_deg');
        $(legend).find('.show_extended img').removeClass('minus_ninety_deg');

        torque_player.pauseLayer();

      }
      else{

        $(legend).find('.species_text ul').addClass('alone');

      }
};

/* Collapse @legend */
ui_config['uiCollapseLegend']=function(legend){

      $(legend).find('.species_info_condensed').show();
      $(legend).find('.show_extended span').removeClass('glyphicon-minus');
      $(legend).find('.show_extended span').addClass('glyphicon-plus');
      $(legend).find('.show_panel').hide();

      if(ui_config.isMobile()){

        $(legend).find('.legend_content .species_img img').show();

        $(legend).find('.show_extended img').removeClass('ninety_deg');
        $(legend).find('.show_extended img').addClass('minus_ninety_deg');


      }
      else{

        $(legend).find('.species_text ul').removeClass('alone');

      }

};

ui_config['updateUniqueMapUi']=function(position,update_ui){

      this.mode='single';

      zoomExtend.disable();

      //Switcher update
      if(update_ui) $('.double_map_switch').prop('checked', false);

      if(this.current_conf['unique']===''){

          //Creating empty objects
          this.initUniqueMap();

      }

      this.copyMapState(this.current_conf[position],this.current_conf['unique']);
      this.updateSpeciesLegend(this.current_conf['unique'],'left');

      this.activateSpeciesSelector(this.current_conf[position],'unique');


      this.updateUrlHash();

      //this.updateSpeciesLegend(this.current_conf[position],'unique');
      //      this.updateSpeciesLegend(this.current_conf['unique'],'unique');
      this.uiUpdateActions('unique_map','none');


};


/* Update UI actions depending on current mode */
ui_config['uiUpdateActions']=function(mode,position){

      if(position=='unique') position='left';

      if(mode==='unique_map'){

        $('.selector.unique').show();
        $('.panel-info .double_selectors').hide();
        $('.legends_right').hide();
        $('#legend_stack').addClass('unique');

        $('.legends_left .actions .show_double_map').show();
        $('.legends_left .actions .move_to').hide();
        $('.legends_left .actions .show_unique_map').hide();

        //$('#year_week_info').addClass('col-md-8');
        //$('#year_week_info').removeClass('col-md-4');


        $('#year_left_info').hide();
        //if(ui_config.isDesktop()) $('#double_years').addClass('right');

        $('#year_left .dropdown-menu').addClass('pull-right');

      }
      else if(mode==='double_map'){

        $('.selector.unique').hide();
        $('.panel-info .double_selectors').show();
        $('.legends_right').show();
        $('#legend_stack').removeClass('unique');

        $('.legends_left .actions .show_double_map').hide();
        $('.legends_left .actions .move_to').show();
        $('.legends_left .actions .show_unique_map').show();


        //$('#year_week_info').addClass('col-md-4');
        //$('#year_week_info').removeClass('col-md-8');


        $('#year_left_info').show();
        //$('#double_years').removeClass('right');

        $('#year_left .dropdown-menu').removeClass('pull-right');

      }
      else if(mode==='temperature'){

        $('#temperature_'+position).show();
        $('#map_'+position).hide();
        $('#precipitation_'+position).hide();


      }
      else if(mode==='precipitation'){

        $('#temperature_'+position).hide();
        $('#map_'+position).hide();
        $('#precipitation_'+position).show();

      }
      else if(mode==='species'){

        $('#precipitation_'+position).hide();
        $('#temperature_'+position).hide();
        $('#map_'+position).show();


      }

};


/* Checks if maps in @position has pending updates */
ui_config['hasChanges']=function(position){

      if(position==='right' && this.isMobile()) return false;

      else{

        return ( this.new_conf[position].getYear() !=='' && this.new_conf[position].getYear()!=this.current_conf[position].getYear() ) ||
                ( this.new_conf[position].getMapTypeCode() !=='' &&  this.new_conf[position].getMapTypeCode()!=this.current_conf[position].getMapTypeCode()) ||
                ( this.new_conf[position].getSpeciesCode()!=='' &&  this.new_conf[position].getSpeciesCode()!=this.current_conf[position].getSpeciesCode());

      }

};


ui_config['getImagePath']=function(config,thumb){

      var path = $('#current_path').val();

      var species_img='species';
      if(thumb) species_img='species_thumb';

      if(config['input_type']==='species') return path+"/img/"+species_img+"/"+config['species_code'].toLowerCase()+".png";
      else return path+"/img/ebp_new/"+config['species_code'].toLowerCase()+".svg";
};

ui_config['showTab']=function(_type,code){

      if(_type==='species'){

        if(ui_config.isMobile()) $('.modal-body').html('<div class="col-md-12"><img style="height:250px;max-width: 100%;" class="text-center" class="img-responsive" src="'+ui_config.getImagePathByCode(code,_type,false)+'"/></div><div style="clear:both;"></div>');
        else $('.modal-body').html('<h2 class="species_title"><span class="common_name">'+$("#"+code+" .title" ).text()+'</span><span class="latin_name">-'+$("#"+code+" .species_latin" ).text()+'</span></h2><p class="text-center"><img class="text-center" class="img-responsive" src="'+ui_config.getImagePathByCode(code,_type,false)+'"/></p>');


      }
      else{

        $('.modal-body').html(legend.getTabText(code));

      }


};

ui_config['getMapType']=function(position){

      var map_type='';

      if(this.new_conf[position].getMapType() || (!this.new_conf[position].isSpecies() && this.new_conf[position].getSpeciesCode()!=='')) {

        if(this.new_conf[position].isTemperature()) map_type=this.new_conf[position].getSpeciesCode();
        else  map_type=this.new_conf[position].getMapType();

      }
      else {

        if(this.current_conf[position].isSpecies()) map_type=this.current_conf[position].getMapType();
        else map_type=this.current_conf[position].getSpeciesCode();


      }

      return map_type;

};

ui_config['selectDropdown']=function(dropdown_id,value,pre_select){

      var updated=false;

      $('#'+dropdown_id).removeClass('updated');

      var selected_li=$('#'+dropdown_id).find("li[data-value='" + value + "']");

      if(value.toString().indexOf("_") > -1){

        var last_year=value.toString().split('_')[1];

        if(last_year==$('#last_52_weeks_year').val())  $('#'+dropdown_id+' .btn').html('Last 52 weeks <span class="caret"></span>');
        else $('#'+dropdown_id+' .btn').html('Previous last <span class="caret"></span>');

      }
      else{

        $('#'+dropdown_id+' .btn').html($(selected_li).find('a').text() + ' <span class="caret"></span>');

      }

      $('#'+dropdown_id+' .btn').val(value);

      if(!$(selected_li).hasClass('selected')) updated=true;

      if(!pre_select){

        $('#'+dropdown_id+' li').removeClass('selected');
        $(selected_li).addClass('selected');

      }
      else{

        if(updated) $('#'+dropdown_id+' .btn').addClass('updated');
        else  $('#'+dropdown_id+' .btn').removeClass('updated');

      }

      return updated;

};


/* Layer_config extended for double map */

layer_config['base_layers']={
    'dc_1':{
      'center':[14.14,39.438513366],
      /* 'center':[14.14,40.046513366],*/
      'bounds':[-18,-9,48,88],
      'opposite': 'df_1'
    },
    'df_1':{
      'center':[9.4836835473,28.701516612],
      /* 'center':[9.4836835473,29.8101516612],*/
      'bounds':[-8,-10,33,67],
      'opposite': 'dc_1'
    },
    'dc_15':{
      'center':[21.21,59.11555030573],
      /* 'center':[21.21,60.0735030573],*/
      'bounds':[-16,-9,68,130],
      'opposite': 'df_15'
    },
    'df_15':{
      'center':[17.225380069,42.8018484573],
      /* 'center':[17.225380069,44.7468484573],*/
      'bounds':[-12,-7,45,98],
      'opposite': 'dc_15'
    },
    's_1':{
      'center':[8.5,14.7177296309],
      'bounds':[-12,-7,27,37]

    }
};


layer_config['extendCoverage']=function(zoom){

  this.state['config']['prev_base']=this.getCurrent('base');
  this.state['config']['prev_mode']='double';

  this.setCurrent('zoom',parseInt(zoom));
  this.setCurrent('base',this.base_layers[this.getCurrent('base')]['opposite']);


  this.loadBaseLayer();


};


layer_config['setDoubleBase']=function(){

  var current_base=this.getCurrent('base');
  if(this.state['config']['prev_base']!=='') this.setCurrent('base',this.state['config']['prev_base']);

  this.state['config']['prev_mode']=this.state['config']['mode'];
  this.state['config']['prev_base']=current_base;
  this.state['config']['mode']='double';

  this.loadBaseLayer();

};





function init(desktop) {
  // create leaflet map

  map = L.map('map', {
      zoomAnimation: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    /*  maxBounds: L.latLngBounds(L.latLng(-12, -5), L.latLng(120, 60)), southwest, northeast*/
      center: [8.29729779028,11.4314413591],
      zoomControl: false,
      zoom: 5
    });

    ui_config.last_week=parseInt($('#last_52_weeks_week').val());
    ui_config.blockMissingYears();

    map.doubleClickZoom.disable();
    setZoomButtons(desktop);

    loadParams(desktop);
    if(desktop || ui_config.isEmbedded()) torque_player.init();

    layer_config.loadBaseLayer();

    loadMap(false);

}




function loadParams(desktop){

    //loadPartner();

  var mapArray = window.location.hash.split('/');
  var mode='double';

   if(mapArray.length >2){

      var map_l=mapArray[2];

      if(mapArray.length >3 && desktop) var map_r=mapArray[4];
      else mode='single';

      var patt = new RegExp('^[py]|[m|r|q|p|t]([52weeksprev]|[52weeks]|[0-9]{4})');

      if(patt.test(map_l)){

          var parts = map_l.match(/[a-z]+|[0-9]+|-+|[0-9]{4}\_[0-9]{4}/g);

          //$('#type_left').selectpicker('val', parts[0]);

          var year=parts[1];

          if(parts[2]) {

            if(parts[2]=='-') year=year+parts[2];
            else if (parts[2]=='weeks') year=ui_config.getLast52WeeksRange();
            else if (parts[2]=='weeksprev') year=ui_config.getLast52WeeksPrevRange();
            else  year=year+'_'+parts[2];

          }

          //$('#year_left').selectpicker('val', year);
          //$('#

          var input_type='species';
          if(parts[0]==='t'){

            if(mapArray[1]==='mm') input_type='precipitation';
            else input_type='temperature';

          }

          var position='left';
          if(mode==='single') position='unique';

          ui_config.loadConfig(mapArray[1],parts[0],year,position,input_type);


      }


      if(patt.test(map_r) && desktop){

        var parts = map_r.match(/[a-z]+|[0-9]+|-+|[0-9]{4}\_[0-9]{4}/g);
        var year=parts[1];

        if(parts[2]) {

          if(parts[2]=='-') year=year+parts[2];
          else if (parts[2]=='weeks') year=ui_config.getLast52WeeksRange();
          else if (parts[2]=='weeksprev') year=ui_config.getLast52WeeksPrevRange();
          else  year=year+'_'+parts[2];

        }

        var input_type='species';


        if(parts[0]==='t'){

          if(mapArray[3]==='mm') input_type='precipitation';
          else input_type='temperature';

        }

        ui_config.loadConfig(mapArray[3],parts[0],year,'right',input_type);


      }




  }
  else{


    if(desktop){

      ui_config.loadConfig(ui_config['default_conf']['left']['species'],ui_config['default_conf']['left']['map_type'],ui_config['default_conf']['left']['year'],'left',ui_config['default_conf']['left']['input_type']);
      ui_config.loadConfig(ui_config['default_conf']['right']['species'],ui_config['default_conf']['right']['map_type'],ui_config['default_conf']['right']['year'],'right',ui_config['default_conf']['right']['input_type']);

    }
    else{

      ui_config.loadConfig(ui_config['default_conf']['unique']['species'],ui_config['default_conf']['unique']['map_type'],ui_config['default_conf']['unique']['year'],'unique',ui_config['default_conf']['unique']['input_type']);

    }



  }

  ui_config.init(desktop,mode);

}


function showNav() {


    if($('#sidebar-wrapper').hasClass('shown')){

      $('#sidebar-wrapper').removeClass('shown');
      //document.getElementById("sidebar-wrapper").style.width = "0";

      $('#show_species').removeClass('shown');
      $('#show_species img').removeClass('bottom');

      $('#sidebar-wrapper').attr("data-left",0);
      $('#sidebar-wrapper').attr("data-right",1);

      $('.selector').attr('disable', '').removeClass('frozen');
      $('#frozen_left').removeClass();
      $('#frozen_right').removeClass();


      if('{{mobile}}'==true) $('#show_species').hide();

    }
    else{

      $('#sidebar-wrapper').addClass('shown');

      $('#sidebar-wrapper').attr("data-left",1);
      $('#sidebar-wrapper').attr("data-right",1);

      $('#show_species').addClass('shown');


      $('#show_species img').addClass('bottom');
      if('{{mobile}}'==true) $('#show_species').show();

    }


}



$(function() {

  $('#cancel_both_update').click(function() {

    ui_config.cancelBothPreloadSpecies();

  });


  $('.legend .show_panel').click(function() {

    var position = $(this).attr('data-position');


    if(!$('#sidebar-wrapper').hasClass('shown')) {

      if(ui_config.isDesktop()) ui_config.freeze(position);
      $('#sidebar-wrapper').attr('data-'+position,1);

    }
    else{

      if(ui_config.isDesktop()) ui_config.freeze(position);
      $('#sidebar-wrapper').attr('data-'+position,0);

    }

    showNav();

/* TODO: create scroll form species_code */

    return true;

  });





  $("#update_conf").click(function() {

    ui_config.updateMapViz();


  });



  $('#data_tab li').click(function() {

    $('#data_tab li').removeClass('active');

    if($(this).hasClass('species')){

      $('.context_data_panel').hide();
      $('.species_panel').show();
      $('#data_tab .species').addClass('active');

    }
    else{

      $('.context_data_panel').show();
      $('.species_panel').hide();
      $('#data_tab .context').addClass('active');

    }


  });


  $('#map_info').on('show.bs.modal', function (event) {

    var button = $(event.relatedTarget);
    var _type = button.data('type');

    if(button.hasClass('disabled')){

      event.preventDefault();
      event.stopImmediatePropagation();
      return false;

    }
    else{

      var code='';

      if(_type==='map'){

        var position = button.data('position');
        if(ui_config.isSingleMode()) position='unique';
        code=ui_config.getMapType(position);
        if(code==='meteo') code='mm';

      }
      else{

        code = button.data('code');
        if(code==='meteo') code='mm';
      }

      ui_config.showTab(_type,code);

    }

  });




  /*
   *    FIND A SPECIES BAR
   */

  $('#find_species').on('keyup', function() {

    var text_typed = $(this).val().toLowerCase();

    $(".species_list .species_common_name").parent().parent().css('display','none');
    $(".species_list span").filter(function() { return ($(this).text().toLowerCase().indexOf(text_typed) > -1) }).parent().parent().css('display','block');


  });

  /*
   *    TOGGLE LANGUAGE MENU
   */

   $('.lang').on('click', function() {
     if ($(this).hasClass('open')) {
       $(this).removeClass('open');
       $('.lang ul').hide();
     } else {
     $('.lang').addClass('open');
     $('.lang ul').show();
   }
   });

   $('.lang li a').on('click', function() {

     location.replace($(this).data('base-url')+ui_config.getConfigURL());

   });


   /*
    *    TOGGLE ADMIN MENU
    */

    $('.admin').on('click', function() {
      if ($(this).hasClass('open')) {
        $(this).removeClass('open');
        $('.admin ul').hide();
      } else {
      $('.admin').addClass('open');
      $('.admin ul').show();
    }
    });



  $('.close-button').on('click', function() {
    $('.navbar-collapse').removeClass('in');
  });


  $('.label-mode').on('click', function() {

    if($('#map_mode_panel').is(':visible')){

      $('#map_mode_panel').hide();
      $('.label-mode i').addClass('fa-chevron-down');
      $('.label-mode i').removeClass('fa-chevron-up');

    }
    else {
        $('#map_mode_panel').show();
        $('.label-mode i').addClass('fa-chevron-up');
        $('.label-mode i').removeClass('fa-chevron-down');
      }

  });


  $('.time_btn').on('click', function() {

    $(this).siblings().removeClass('active_side');
    $(this).addClass('active_side');
    ui_config.updateTimeMode($(this).data('value'));
    $('#map_mode_panel').hide();
    $('.label-mode i').addClass('fa-chevron-down');
    $('.label-mode i').removeClass('fa-chevron-up');

  });







});
