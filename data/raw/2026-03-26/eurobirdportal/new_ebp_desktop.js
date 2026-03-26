


ui_config['showFrozenLegend']=function(legend_position,position){

  $('.legends_'+legend_position+' .current .show_extended').hide();
  $('.legends_'+legend_position+' .current .cancel_update').show();

  //cancel_update
  if(this.isDesktop()){

    var frozen_legend=$('.legends_'+legend_position+' .frozen');
    if($(frozen_legend).css('display') == 'none') $(frozen_legend).show();
    $('.legends_'+legend_position+' .frozen .species_common_name').html(this.current_conf[position]['common_name']);
    $('.legends_'+legend_position+' .frozen .species_common_name').parent().data("code",this.current_conf[position]['species_code']);



    $('.legends_'+legend_position+' .frozen .species_img img').attr("src",this.getImagePath(this.current_conf[position],true));
    $('.legends_'+legend_position+' .frozen .species_img a').data("code",this.current_conf[position]['species_code']);

    if(this.isCollapsedLegend(legend_position)) this.uiExpandLegend($('.legends_'+legend_position+' .current'));

    if(ui_config.isDoubleMode()){

      var opposite=ui_config.opposite[legend_position];

      if(this.isCollapsedLegend(opposite)) {

        this.collapseLegend($('.legends_'+opposite+' .current'));

      }

      if(!$('.legends_'+opposite+' .current').hasClass('new_selection')){

          $('.legends_'+opposite+' .current .show_extended').attr('disabled','disabled');

      }

    }


    $('.legends_'+legend_position+' .current .new_selection').show();
    $('.legends_'+legend_position+' .current').addClass('new_selection');

    $('.legends_'+legend_position+' .current .actions').hide();
    $('.legends_'+legend_position+' .current .legend_map').hide();

    $('.legends_'+legend_position+' .current .legend_header').addClass('preUpdated');



  }


  $('.legends_'+legend_position+' .current .species_common_name').html(this.new_conf[position]['common_name']);
  $('.legends_'+legend_position+' .current .species_common_name').parent().data("code",this.new_conf[position]['species_code']);

  if($('.legends_'+legend_position+' .current .species_common_name').height() >20 ) $('.legends_'+legend_position+' .current .species_common_name').addClass('long');
  else if ($('.legends_'+legend_position+' .current .species_common_name').hasClass('long')) $('.legends_'+legend_position+' .current .species_common_name').removeClass('long');

  $('.legends_'+legend_position+' .current .species_img img').attr("src",this.getImagePath(this.new_conf[position],true));
  $('.legends_'+legend_position+' .current .species_img a').data("code",this.new_conf[position]['species_code']);


};




/* Event moveTo clicked. Clone event from opossite @position to @position */
ui_config['eventMoveTo'] = function(position){

  this.copyMapState(this.current_conf[position],this.current_conf[this.opposite[position]]);

  this.updateSpeciesLegend(this.current_conf[this.opposite[position]],this.opposite[position]);

  this.activateSpeciesSelector(this.current_conf[this.opposite[position]],this.opposite[position]);

  this.updateUrlHash();

  loadMap(false);
  this.uiUpdateActions('double_map','none');


  torque_player.updateTimeLine();

};



/* Allows to copy one @species_conf_from to a segon @species_conf_to  */
ui_config['copyEmptyState']=function(species_conf_from,species_conf_to){

      species_conf_to['species_code']='HIRRUS';
      species_conf_to['common_name']=$("#"+species_conf_to['species_code']+" .title" ).text();;
      species_conf_to['year']=species_conf_from['year'];
      species_conf_to['map_type']='p';
      species_conf_to['input_type']='species';

};



/* From switch */
ui_config['setDoubleMapMode'] =function(update_ui,from_editor){

  this.mode='double';

  if(update_ui) $('.double_map_switch').prop('checked', true);

  if(this.current_conf['unique'].isSpecies()) this.copyMapState(this.current_conf['unique'],this.current_conf['left']);
  else this.copyEmptyState(this.current_conf['unique'],this.current_conf['left']);

  this.copyMapState(this.current_conf['unique'],this.current_conf['right']);

  layer_config.setDoubleBase();

  this.updateUrlHash();

  this.updateSpeciesLegend(this.current_conf['left'],'left');
  this.updateSpeciesLegend(this.current_conf['right'],'right');

  this.activateSpeciesSelector(this.current_conf['left'],'left');
  this.activateSpeciesSelector(this.current_conf['right'],'right');

  if(!this.isCollapsedLegend('left') && this.isCollapsedLegend('right')) this.collapseLegend($('.legend.left.current'));

  if(this.isCollapsedLegend('left') && !this.isCollapsedLegend('right')) this.collapseLegend($('.legend.right.current'));


  loadMap(false);

  zoomPlus.disable();
  zoomMinus.disable();
  zoomExtend.enable();

  this.uiUpdateActions('double_map','none');

  // if(ui_config.isPhenology()) pheno.reDraw(torque_manager.getxy30x30(),'both');
  torque_player.updateTimeLine();


};


  /* Cancel update both from left */
  ui_config['cancelBothPreloadSpecies']=function(){

        if(this.prev_year_mode!=this.year_mode){

          this.year_mode=this.prev_year_mode;
          this.prev_year_mode='';

          $('.time_btn').removeClass('active_side');
          $('.time_btn[data-value="'+this.year_mode+'"]').addClass('active_side');

          $(this).addClass('active_side');

          ui_config.updateTimeModeInfo();
          ui_config.updateTimeModeAvailableYears();

        }


        if(ui_config.isSingleMode()){

          ui_config.cancelPreloadSpecies('left');

        }
        else{

          this.uiRemovePreloadState('both');


          this.updateSpeciesLegend(this.current_conf['left'],'left');
          this.activateSpeciesSelector(this.current_conf['left'],'left');

          var new_conf=Object.create(MapConf);
          this.setConfig(new_conf,'new','left');

          ui_config.updateContextActiveYears(this.current_conf['left'],'left');


          this.updateSpeciesLegend(this.current_conf['right'],'right');
          this.activateSpeciesSelector(this.current_conf['right'],'right');

          var new_conf=Object.create(MapConf);
          this.setConfig(new_conf,'new','right');

          ui_config.updateContextActiveYears(this.current_conf['right'],'right');

          this.updateUrlHash();

          this.hideUpdateMsg();

        }

        //ui_config.updateTimeModeInfo();


  };

  ui_config['handleBothLegends'] = function(legend){

    var legend_position='right';
    if($(legend).hasClass('left')) legend_position='left';

    var opposite=ui_config.opposite[legend_position];

    ui_config.collapseLegend($('.legend.'+legend_position+'.current'));
    ui_config.collapseLegend($('.legend.'+opposite+'.current'));

  };





  ui_config['updateMapViz'] = function(){

    var meteo_pos='';

    if(this.isSingleMode()){

      if(this.hasChanges('unique')) {

        this.updateMapState('unique','unique');
        this.updateSpeciesLegend(this.current_conf['unique'],'left');

        layer_config.updateBaseStyle(this.getType('unique'),'unique');

      }

      meteo_pos='unique';

      this.updateMapTypeActiveYears(this.new_conf['unique'].isCroMap(),'left');
      this.uiRemovePreloadState('left');

    }
    else{

      if(this.hasChanges('left')) {

        this.updateMapState('left','left');
        this.updateSpeciesLegend(this.current_conf['left'],'left');
        layer_config.updateBaseStyle(this.getType('left'),'left');

      }
      if(this.hasChanges('right')){

        this.updateMapState('right','right');
        this.updateSpeciesLegend(this.current_conf['right'],'right');
        layer_config.updateBaseStyle(this.getType('right'),'right');

      }

      this.updateMapTypeActiveYears(this.new_conf['left'].isCroMap(),'left');
      this.updateMapTypeActiveYears(this.new_conf['right'].isCroMap(),'right');

      this.uiRemovePreloadState('both');

      meteo_pos='right';

    }

    if(this.hasMeteo(meteo_pos)){

        ui_config.activateSpeciesSelector(this.current_conf[meteo_pos],meteo_pos);

    }

    this.updateMapConf();
    this.prev_year_mode=this.year_mode;

  },


/*
 *  FUNCTION TO FREEZE ONE OF THE MAPS
 *
 */

 ui_config['freeze']=function(position) {

   if(ui_config.isSingleMode()) position='unique';

  if (position == 'left') {

    $('#frozen_right').addClass('active');
    $('.selector.right').addClass('frozen').attr('disable','disabled');

  } else if (position == 'right') {

    $('#frozen_left').addClass('active');
    $('.selector.left').addClass('frozen').attr('disable','disabled');

  } else if (position == 'unique') {

    //$('#frozen_full').addClass('active');
    //$('.selector.unique').addClass('frozen').attr('disable','disabled');

  }

};

ui_config['handleRotationMessage']=function(){

  if(window.innerHeight > window.innerWidth){

    $('#rotation_msg').show();
    $('#frozen_full').addClass('active');

  }
  else{

    $('#rotation_msg').hide();
    $('#frozen_full').removeClass('active');
  }

};



$(function() {

    /* Event when desktop mode */

    $('.double_map_switch').change(function() {

        var checked=$(this).is(':checked');
        if(checked) {

          if(ui_config.isTablet()){

            ui_config.handleRotationMessage();
            $('#rotation_msg .double_map_switch').prop('checked', true);


          }

          ui_config.setDoubleMapMode(false,false);

        }
        else{

          if(ui_config.isTablet() && $('#rotation_msg').is(':visible')) {

            $('#rotation_msg').hide();
            $('#map_switcher .double_map_switch').prop('checked', false);

          }
          ui_config.setSingleMapMode('left',false,false);

        }

    });


    $('.legend .move_to').click(function() {

      var legend=$(this).closest('.legend');

      if($(legend).hasClass('left')) ui_config.eventMoveTo('left');
      else  ui_config.eventMoveTo('right');


    });


    $('.legend .show_unique_map').click(function() {

      var legend=$(this).closest('.legend');

      if($(legend).hasClass('left')) ui_config.setSingleMapMode('left',true);
      else  ui_config.setSingleMapMode('right',true);


    });

    $('.legend .show_double_map').click(function() {

      if(ui_config.isTablet()){

        ui_config.handleRotationMessage();
        $('#rotation_msg .double_map_switch').prop('checked', true);

      }

      ui_config.setDoubleMapMode(true,false);

    });


      /* Show/hide low resolution maps when CRO is chosen */
      $(".show_extra").click(function (){

          var path = $('#current_path').val();

          if($(this).hasClass('active')){

            $(this).removeClass('active');
            $(this).find('img').attr('src',path+"/img/ebp_new/ic-remove-red-eye-black-24-px.svg");



          }
          else{

            $(this).addClass('active');
            $(this).find('img').attr('src',path+"/img/ebp_new/ic-remove-red-eye-black-24-px_active.svg");

          }

      });



    $('.legend .cancel_update').click(function() {

      var legend=$(this).closest('.legend');


      if($(legend).hasClass('left')){

        ui_config.cancelPreloadSpecies('left');

      }
      else{

        ui_config.cancelPreloadSpecies('right');

      }


    });

      /*
       *    SHOW MAP DIVs ON HOVER SELECTORS (LEFT, RIGHT)
       */

      $('.selector').mouseover( function() {


        if ($(this).attr('disable') != 'disabled') {

          $(this).addClass('hover');
        }


        if ($('#frozen_left').hasClass('active') || $('#frozen_right').hasClass('active')) {} else {

            if ($(this).hasClass('left')) {

              $('#frozen_left').addClass('hover')
                               .append('<div class="box">L</div>');

            } else if ($(this).hasClass('right')) {

              $('#frozen_right').addClass('hover')
                                .append('<div class="box">R</div>');

            }

       }
      });


      $('.selector').mouseout(function() {

        $('#frozen_right').removeClass('hover');
        $('#frozen_left').removeClass('hover');
        $('.box').remove();
        $(this).removeClass('hover');

      });


      $('.legend .show_extended').click(function() {

        var legend=$(this).closest('.legend');
        ui_config.handleBothLegends(legend);

      });



        $( ".selector" ).click(function() {

          if ($(this).attr('disable') == 'disabled') {} else { // when one map is frozen, buttons are not clickable

          var code=$(this).closest( ".panel-info" ).attr('id');
          var input_type=$(this).closest( ".panel-info" ).data('type');
          var common_name=$("#"+code+" .title" ).text();
          var position='right';
          var opposite='left';
          if($(this).hasClass('left')) {

            position='left';
            opposite='right';
          }

          ui_config.eventSelectSpecies(code,input_type,common_name,position);

          $('#sidebar-wrapper').attr('data-'+position,0);

          if($('#sidebar-wrapper').attr('data-'+opposite)==0) showNav();


          $(this).addClass('active');

          if ($('#frozen_right').hasClass('active') || $('#frozen_left').hasClass('active')) {
            showNav();
          }

      }

    });


      window.addEventListener("resize", function() {
     // Get screen size (inner/outerWidth, inner/outerHeight)


       if(ui_config.isTablet() && ui_config.isDoubleMode()){

           ui_config.handleRotationMessage();

       }


     }, false);


      /*
       *    RESIZING SIDEBAR
       */

      function sidebarResize() {
        if ($('#timeline').hasClass('open')) {
          var timeline = 158;
        } else {
          var timeline = 58;
        }
        var height = $(window).height() - timeline - 90;
        $('#sidebar-wrapper').css('height',height+'px');
      }

      // Is triggered manually on timeline.js when timeline-toggle button is clicked

      $('#timeline').on('heightChange', function() {

        sidebarResize();

      });

      // Triggered when window is resized

      $(window).resize(function() {
        sidebarResize();
      });

      // Function is called when page loads

      sidebarResize();






});
