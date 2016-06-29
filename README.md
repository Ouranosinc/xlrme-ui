User Interface for the XLRM-E Web Application
============================================

Robust Decision Making (RDM) is a decision-making approach developed at RAND by Robert Lempert and colleagues. It targets decisions plagued by _deep uncertainty_, that is uncertainty so large that it defies concensus about its shape and magnitude. This deep uncertainty is often poorly handled by traditional decision support tools such as sensitivity analyses. The RDM approach suggests a systematic and iterative approach to decision-making, in the spirit of Structured Decision Making (SDM).

As a climate service center, Ouranos is faced with the task of providing useful, actionable information about the future climate to decision-makers and managers. Traditionnaly, this information was delivered in the shape of climate impact studies. That is, climate projections based on different greenhouse gas (GHG) emissions scenarios and global climate models (GCM) were used to drive impact models to provide a picture of the possible impacts of climate change on various issues such as water management, agriculture, infrastructure design or health. These impact studies are however often not sufficient to support decision-making exercises. 

Natural Resources Canada provided funding to Ouranos to explore decision-making approaches with the objective of supporting investment decisions in the hydropower sector. Two case studies were done in collaboration with Hydro-Québec and Manitoba Hydro. This repository contains the web application built to visualize the results from these case studies, and is populated for demo purposes with synthetic data. This project should be considered as a proof of concept that is evolving toward a more mature implementation. 


Installation
------------
In the top directory, create an `instance/` directory holding a `config.py` file defining the secret key and other instance specific configuration options, such as

    SECRET_KEY = 'E]!u9r9+6ig?=UFTHHJyg9pRo*"QoR<DtPm32w60nwO6yx}bL5$|Y1Bo3X<X|V'
    DEBUG = True
    
Install the requirements using 

    pip install -r requirements.txt

Then start the local server provided by Flask

    python run.py 

Then simply open a browser and go to `http://localhost:8080` 

Note that this server is not intended to be used in a production environment. 


Updating the translations
-------------------------
In the `dmapp/` directory, run:

    pybabel extract -F babel.cfg -k lazy_gettext -o messages.pot .
    pybabel update -i messages.pot -d translations
    pybabel compile -d translations

Creating your own case study
----------------------------
This version only includes one simple example of an application of the 
XLRM-E approach. The original version includes two other case studies. 
Creating your own custom application requires creating datasets holding
the results of the exploration phase, as well as expert estimates. Drop 
me a line if you want more info about how to do this. 


Architecture
------------
The architecture of this application has some serious shortcuts. If you 
are interested in using this code for more than a proof of concept, I 
can suggest a few modifications before you start: 
  
  * Replace the data server by a real database;
  * Use https and real user authentication; 
  * Separate framework and content more cleanly;
  
